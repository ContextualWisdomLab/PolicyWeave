#!/bin/sh
set -eu

: "${PGHOST:=127.0.0.1}"
: "${PGPORT:=5432}"
: "${PGUSER:=policyweave_ci}"
: "${PGDATABASE:=policyweave_test}"
: "${PGPASSWORD:=policyweave_ci_password}"
export PGHOST PGPORT PGUSER PGDATABASE PGPASSWORD

psql_command() {
  psql --no-psqlrc --set ON_ERROR_STOP=1 "$@"
}

expect_failure() {
  failure_name=$1
  if psql_command >"/tmp/${failure_name}.log" 2>&1; then
    echo "expected PostgreSQL failure: ${failure_name}" >&2
    return 1
  fi
}

# server_version_num must be >= 180000 and < 190000.
server_version_num=$(psql_command --tuples-only --no-align --command 'show server_version_num')
if [ "$server_version_num" -lt 180000 ] || [ "$server_version_num" -ge 190000 ]; then
  echo "unsupported PostgreSQL server_version_num: ${server_version_num}" >&2
  exit 1
fi

psql_command --file db/migrations/0001_policy_revision.sql

psql_command <<'SQL'
insert into policy_revision (policy_revision_id, tenant_account_id, revision_number)
values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 1);

select upsert_collection_item(
  '10000000-0000-4000-8000-000000000001',
  'contact_email',
  'Contact email',
  'required',
  'Account registration form'
);
select upsert_collection_item(
  '10000000-0000-4000-8000-000000000001',
  'contact_email',
  'Account contact email',
  'optional',
  'Account profile form'
);

do $runtime_assertion$
declare
  stored_count integer;
  stored_label text;
begin
  select count(*), max(collection_item_label)
    into stored_count, stored_label
    from collection_item
   where policy_revision_id = '10000000-0000-4000-8000-000000000001'
     and collection_item_key = 'contact_email';

  if stored_count <> 1 or stored_label <> 'Account contact email' then
    raise exception 'collection-item UPSERT was not idempotent';
  end if;
end;
$runtime_assertion$;
SQL

expect_failure no_collection_conflict <<'SQL'
begin;
insert into policy_revision (
  policy_revision_id, tenant_account_id, revision_number, no_collection_confirmed
) values (
  '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 2, true
);
insert into collection_item (policy_revision_id, collection_item_key, collection_item_label)
values ('10000000-0000-4000-8000-000000000002', 'contact_email', 'Contact email');
commit;
SQL

expect_failure retention_rule_missing <<'SQL'
begin;
insert into policy_revision (
  policy_revision_id, tenant_account_id, revision_number, retention_status
) values (
  '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 3, 'applies'
);
commit;
SQL

psql_command <<'SQL'
insert into policy_revision (policy_revision_id, tenant_account_id, revision_number)
values
  ('10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 4),
  ('10000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', 5);
insert into service_profile (policy_revision_id, service_name)
values ('10000000-0000-4000-8000-000000000004', 'Example Service');
SQL

expect_failure revision_owner_change <<'SQL'
begin;
update service_profile
   set policy_revision_id = '10000000-0000-4000-8000-000000000005'
 where policy_revision_id = '10000000-0000-4000-8000-000000000004';
commit;
SQL

psql_command --file db/migrations/0001_policy_revision.down.sql
psql_command <<'SQL'
do $rollback_assertion$
begin
  if to_regclass('public.policy_revision') is not null
     or exists (select 1 from pg_proc where proname in ('upsert_collection_item', 'enforce_policy_revision_facts'))
     or exists (select 1 from pg_type where typname in ('collection_fact_mode', 'retention_fact_status')) then
    raise exception 'rollback left migration-owned objects behind';
  end if;
end;
$rollback_assertion$;
SQL

# A second apply/down cycle verifies that rollback restores a clean provisioning state.
psql_command --file db/migrations/0001_policy_revision.sql
psql_command --file db/migrations/0001_policy_revision.down.sql
