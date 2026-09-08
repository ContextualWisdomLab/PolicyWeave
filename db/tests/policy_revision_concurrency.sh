#!/bin/sh
set -eu

: "${PGHOST:=127.0.0.1}"
: "${PGPORT:=5432}"
: "${PGUSER:=policyweave_ci}"
: "${PGDATABASE:=policyweave_test}"
: "${PGPASSWORD:=policyweave_ci_password}"
export PGHOST PGPORT PGUSER PGDATABASE PGPASSWORD

test_run_id=$$
parent_release_fifo="/tmp/policyweave_parent_release_${test_run_id}"
parent_ready_file="/tmp/policyweave_parent_ready_${test_run_id}"
parent_writer_log="/tmp/policyweave_parent_writer_${test_run_id}.log"
item_writer_log="/tmp/policyweave_item_writer_${test_run_id}.log"
upsert_release_fifo="/tmp/policyweave_upsert_release_${test_run_id}"
upsert_ready_file="/tmp/policyweave_upsert_ready_${test_run_id}"
first_upsert_log="/tmp/policyweave_first_upsert_${test_run_id}.log"
second_upsert_log="/tmp/policyweave_second_upsert_${test_run_id}.log"
parent_writer_process_id=
item_writer_process_id=
first_upsert_process_id=
second_upsert_process_id=

psql_command() {
  psql --no-psqlrc --set ON_ERROR_STOP=1 "$@"
}

cleanup_concurrency_test() {
  for writer_process_id in \
    ${parent_writer_process_id:-} \
    ${item_writer_process_id:-} \
    ${first_upsert_process_id:-} \
    ${second_upsert_process_id:-}; do
    kill "$writer_process_id" 2>/dev/null || true
    wait "$writer_process_id" 2>/dev/null || true
  done
  rm -f \
    "$parent_release_fifo" "$parent_ready_file" "$parent_writer_log" "$item_writer_log" \
    "$upsert_release_fifo" "$upsert_ready_file" "$first_upsert_log" "$second_upsert_log"
}

wait_for_file() {
  expected_file=$1
  wait_name=$2
  attempt_count=0
  while [ ! -f "$expected_file" ]; do
    attempt_count=$((attempt_count + 1))
    if [ "$attempt_count" -ge 200 ]; then
      echo "timed out waiting for ${wait_name}" >&2
      return 1
    fi
    sleep 0.05
  done
}

wait_for_lock() {
  writer_application_name=$1
  writer_log=$2
  attempt_count=0
  while :; do
    waiting_count=$(psql_command --tuples-only --no-align --command \
      "select count(*) from pg_stat_activity where application_name = '${writer_application_name}' and wait_event_type = 'Lock'")
    if [ "$waiting_count" -ge 1 ]; then
      return 0
    fi
    attempt_count=$((attempt_count + 1))
    if [ "$attempt_count" -ge 200 ]; then
      cat "$writer_log" >&2 || true
      echo "timed out waiting for PostgreSQL lock: ${writer_application_name}" >&2
      return 1
    fi
    sleep 0.05
  done
}

trap cleanup_concurrency_test 0 1 2 15

mkfifo "$parent_release_fifo" "$upsert_release_fifo"
psql_command --file db/migrations/0001_policy_revision.sql

psql_command <<'SQL'
insert into policy_revision (policy_revision_id, tenant_account_id, revision_number)
values ('30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 1);
SQL

PGAPPNAME=policyweave_parent_writer PGOPTIONS='-c statement_timeout=15000' \
  psql --no-psqlrc --set ON_ERROR_STOP=1 >"$parent_writer_log" 2>&1 <<SQL &
begin;
update policy_revision
   set no_collection_confirmed = true
 where policy_revision_id = '30000000-0000-4000-8000-000000000001';
\! touch "$parent_ready_file"
\! sh -c 'read release_signal < "$parent_release_fifo"'
commit;
SQL
parent_writer_process_id=$!
wait_for_file "$parent_ready_file" policyweave_parent_writer

PGAPPNAME=policyweave_item_writer PGOPTIONS='-c statement_timeout=15000' \
  psql --no-psqlrc --set ON_ERROR_STOP=1 >"$item_writer_log" 2>&1 <<'SQL' &
begin;
insert into collection_item (policy_revision_id, collection_item_key, collection_item_label)
values ('30000000-0000-4000-8000-000000000001', 'contact_email', 'Contact email');
commit;
SQL
item_writer_process_id=$!
wait_for_lock policyweave_item_writer "$item_writer_log"
printf 'release\n' >"$parent_release_fifo"
wait "$parent_writer_process_id"
parent_writer_process_id=

set +e
wait "$item_writer_process_id"
item_writer_status=$?
set -e
item_writer_process_id=
if [ "$item_writer_status" -eq 0 ]; then
  echo 'competing collection item unexpectedly committed' >&2
  exit 1
fi
grep -F -- 'no-collection confirmation conflicts with collection items' "$item_writer_log"

psql_command <<'SQL'
insert into policy_revision (policy_revision_id, tenant_account_id, revision_number)
values ('30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 2);
SQL

PGAPPNAME=policyweave_first_upsert_writer PGOPTIONS='-c statement_timeout=15000' \
  psql --no-psqlrc --set ON_ERROR_STOP=1 >"$first_upsert_log" 2>&1 <<SQL &
begin;
select upsert_collection_item(
  '30000000-0000-4000-8000-000000000002',
  'contact_email',
  'Initial contact email',
  'required',
  'Account registration form'
);
\! touch "$upsert_ready_file"
\! sh -c 'read release_signal < "$upsert_release_fifo"'
commit;
SQL
first_upsert_process_id=$!
wait_for_file "$upsert_ready_file" policyweave_first_upsert_writer

PGAPPNAME=policyweave_second_upsert_writer PGOPTIONS='-c statement_timeout=15000' \
  psql --no-psqlrc --set ON_ERROR_STOP=1 >"$second_upsert_log" 2>&1 <<'SQL' &
begin;
select upsert_collection_item(
  '30000000-0000-4000-8000-000000000002',
  'contact_email',
  'Concurrent contact email',
  'optional',
  'Account profile form'
);
commit;
SQL
second_upsert_process_id=$!
wait_for_lock policyweave_second_upsert_writer "$second_upsert_log"
printf 'release\n' >"$upsert_release_fifo"
wait "$first_upsert_process_id"
first_upsert_process_id=
wait "$second_upsert_process_id"
second_upsert_process_id=

psql_command <<'SQL'
do $concurrency_assertion$
declare
  stored_count integer;
  stored_label text;
  stored_mode text;
  stored_path text;
begin
  select count(*),
         max(collection_item_label),
         max(collection_mode::text),
         max(collection_path)
    into stored_count, stored_label, stored_mode, stored_path
    from collection_item
   where policy_revision_id = '30000000-0000-4000-8000-000000000002'
     and collection_item_key = 'contact_email';

  if stored_count <> 1
     or stored_label <> 'Concurrent contact email'
     or stored_mode <> 'optional'
     or stored_path <> 'Account profile form' then
    raise exception 'concurrent collection-item UPSERTs did not converge';
  end if;
end;
$concurrency_assertion$;
SQL

psql_command --file db/migrations/0001_policy_revision.down.sql
cleanup_concurrency_test
trap - 0 1 2 15
