#!/bin/sh
set -eu

: "${PGHOST:=127.0.0.1}"
: "${PGPORT:=5432}"
: "${PGUSER:=policyweave_ci}"
: "${PGDATABASE:=policyweave_test}"
: "${PGPASSWORD:=policyweave_ci_password}"
export PGHOST PGPORT PGUSER PGDATABASE PGPASSWORD

test_run_id=$$
dump_file="/tmp/policyweave_restore_${test_run_id}.dump"
list_file="/tmp/policyweave_restore_${test_run_id}.list"
container_dump_file="/tmp/policyweave_restore.dump"
postgres_container_id=

psql_command() {
  psql --no-psqlrc --set ON_ERROR_STOP=1 "$@"
}

cleanup_restore_test() {
  rm -f "$dump_file" "$list_file"
  if [ -n "$postgres_container_id" ]; then
    docker exec "$postgres_container_id" rm -f "$container_dump_file" >/dev/null 2>&1 || true
  fi
  psql --no-psqlrc --command "drop database if exists policyweave_restore" >/dev/null 2>&1 || true
}

wait_for_postgres() {
  attempt_count=0
  while :; do
    if docker exec "$postgres_container_id" pg_isready -U "$PGUSER" -d "$PGDATABASE" >/dev/null 2>&1 \
       && psql_command --command 'select 1' >/dev/null 2>&1; then
      return 0
    fi
    attempt_count=$((attempt_count + 1))
    if [ "$attempt_count" -ge 60 ]; then
      echo 'PostgreSQL did not accept connections after restart' >&2
      return 1
    fi
    sleep 1
  done
}

find_postgres_container() {
  container_id=$(docker ps --filter name=postgres --format '{{.ID}}' | head -n 1)
  if [ -n "$container_id" ]; then
    printf '%s\n' "$container_id"
    return 0
  fi
  docker ps --format '{{.ID}} {{.Ports}}' | awk '/5432/ { print $1; exit }'
}

expect_failure() {
  failure_name=$1
  expected_message=$2
  failure_log="/tmp/${failure_name}.log"
  if psql_command >"$failure_log" 2>&1; then
    echo "expected PostgreSQL failure: ${failure_name}" >&2
    return 1
  fi
  if ! grep -F -- "$expected_message" "$failure_log"; then
    cat "$failure_log" >&2
    echo "unexpected PostgreSQL failure: ${failure_name}" >&2
    return 1
  fi
}

assert_restored_facts() {
  scene_name=$1
  psql_command <<SQL
do \$restore_assertion\$
declare
  collection_revision_count integer;
  service_profile_count integer;
  collection_item_count integer;
  collection_purpose_count integer;
  collection_rule_count integer;
  stored_service_name text;
  stored_item_label text;
  stored_purpose text;
  stored_period text;
  no_collection_revision_count integer;
  no_collection_item_count integer;
  no_collection_rule_count integer;
begin
  select count(*)
    into collection_revision_count
    from policy_revision
   where policy_revision_id = '60000000-0000-4000-8000-000000000001'
     and no_collection_confirmed = false
     and retention_status = 'applies';

  select count(*), max(service_name)
    into service_profile_count, stored_service_name
    from service_profile
   where policy_revision_id = '60000000-0000-4000-8000-000000000001';

  select count(*), max(collection_item_label)
    into collection_item_count, stored_item_label
    from collection_item
   where policy_revision_id = '60000000-0000-4000-8000-000000000001'
     and collection_item_key = 'contact_email';

  select count(*), max(purpose_text)
    into collection_purpose_count, stored_purpose
    from processing_purpose
   where policy_revision_id = '60000000-0000-4000-8000-000000000001'
     and collection_item_key = 'contact_email';

  select count(*), max(retention_period)
    into collection_rule_count, stored_period
    from retention_rule
   where policy_revision_id = '60000000-0000-4000-8000-000000000001';

  select count(*)
    into no_collection_revision_count
    from policy_revision
   where policy_revision_id = '60000000-0000-4000-8000-000000000002'
     and no_collection_confirmed = true
     and retention_status = 'none';

  select count(*)
    into no_collection_item_count
    from collection_item
   where policy_revision_id = '60000000-0000-4000-8000-000000000002';

  select count(*)
    into no_collection_rule_count
    from retention_rule
   where policy_revision_id = '60000000-0000-4000-8000-000000000002';

  if collection_revision_count <> 1
     or service_profile_count <> 1
     or stored_service_name <> 'Restore Probe Service'
     or collection_item_count <> 1
     or stored_item_label <> 'Restore contact email'
     or collection_purpose_count <> 1
     or stored_purpose <> 'Account notices'
     or collection_rule_count <> 1
     or stored_period <> '1 year after account closure'
     or no_collection_revision_count <> 1
     or no_collection_item_count <> 0
     or no_collection_rule_count <> 0 then
    raise exception '${scene_name} did not preserve independent collection and retention facts';
  end if;
end;
\$restore_assertion\$;
SQL
}

if ! command -v docker >/dev/null 2>&1; then
  echo 'docker is required for PostgreSQL restart evidence' >&2
  exit 1
fi

postgres_container_id=$(find_postgres_container)
if [ -z "$postgres_container_id" ]; then
  echo 'postgres container not found for restart evidence' >&2
  docker ps >&2 || true
  exit 1
fi

trap cleanup_restore_test 0 1 2 15

psql_command --file db/migrations/0001_policy_revision.sql

psql_command <<'SQL'
insert into policy_revision (
  policy_revision_id, tenant_account_id, revision_number, retention_status
) values (
  '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 1, 'applies'
);
insert into service_profile (policy_revision_id, service_name, service_url)
values (
  '60000000-0000-4000-8000-000000000001',
  'Restore Probe Service',
  'https://restore.example.test'
);
select upsert_collection_item(
  '60000000-0000-4000-8000-000000000001',
  'contact_email',
  'Restore contact email',
  'required',
  'Account registration form'
);
insert into processing_purpose (policy_revision_id, collection_item_key, purpose_text)
values (
  '60000000-0000-4000-8000-000000000001',
  'contact_email',
  'Account notices'
);
insert into retention_rule (policy_revision_id, retention_period)
values (
  '60000000-0000-4000-8000-000000000001',
  '1 year after account closure'
);

insert into policy_revision (
  policy_revision_id, tenant_account_id, revision_number, no_collection_confirmed, retention_status
) values (
  '60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', 2, true, 'none'
);
SQL

psql_command --command 'checkpoint'

docker restart "$postgres_container_id" >/dev/null
wait_for_postgres
assert_restored_facts restart

docker exec "$postgres_container_id" pg_dump \
  -U "$PGUSER" \
  -d "$PGDATABASE" \
  --no-owner \
  --no-acl \
  --format=custom \
  --schema=public \
  -f "$container_dump_file"

docker cp "$postgres_container_id:$container_dump_file" "$dump_file"
if [ ! -s "$dump_file" ]; then
  echo 'pg_dump produced an empty custom archive' >&2
  exit 1
fi

psql_command --file db/migrations/0001_policy_revision.down.sql
psql_command <<'SQL'
do $rollback_assertion$
begin
  if to_regclass('public.policy_revision') is not null then
    raise exception 'rollback left policy_revision behind before restore';
  end if;
end;
$rollback_assertion$;
SQL

psql_command --command "drop database if exists policyweave_restore"
psql_command --command "create database policyweave_restore"

docker exec "$postgres_container_id" pg_restore -l "$container_dump_file" \
  | grep -v 'SCHEMA - public' >"$list_file"
docker cp "$list_file" "$postgres_container_id:$container_dump_file.list"
docker exec "$postgres_container_id" pg_restore \
  -U "$PGUSER" \
  -d policyweave_restore \
  --no-owner \
  --no-acl \
  --exit-on-error \
  -L "$container_dump_file.list" \
  "$container_dump_file"

PGDATABASE=policyweave_restore assert_restored_facts restore
PGDATABASE=policyweave_restore expect_failure restored_no_collection_conflict 'no-collection confirmation conflicts with collection items' <<'SQL'
begin;
insert into collection_item (policy_revision_id, collection_item_key, collection_item_label)
values ('60000000-0000-4000-8000-000000000002', 'contact_email', 'Contact email');
commit;
SQL

psql_command --command "drop database policyweave_restore"
cleanup_restore_test
trap - 0 1 2 15
