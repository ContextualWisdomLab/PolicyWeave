begin;

create type retention_fact_status as enum ('unresolved', 'applies', 'none');
create type collection_fact_mode as enum ('required', 'optional');

create table policy_revision (
  policy_revision_id uuid primary key,
  tenant_account_id uuid not null,
  revision_number bigint not null check (revision_number > 0),
  no_collection_confirmed boolean not null default false,
  retention_status retention_fact_status not null default 'unresolved',
  created_at timestamptz not null default clock_timestamp(),
  unique (tenant_account_id, revision_number)
);

create table service_profile (
  policy_revision_id uuid primary key references policy_revision (policy_revision_id) on delete cascade,
  service_name text,
  service_url text
);

create table collection_item (
  policy_revision_id uuid not null references policy_revision (policy_revision_id) on delete cascade,
  collection_item_key text not null check (btrim(collection_item_key) <> ''),
  collection_item_label text not null check (btrim(collection_item_label) <> ''),
  collection_mode collection_fact_mode,
  collection_path text check (collection_path is null or btrim(collection_path) <> ''),
  primary key (policy_revision_id, collection_item_key)
);

create table processing_purpose (
  policy_revision_id uuid not null,
  collection_item_key text not null,
  purpose_text text not null check (btrim(purpose_text) <> ''),
  primary key (policy_revision_id, collection_item_key),
  foreign key (policy_revision_id, collection_item_key)
    references collection_item (policy_revision_id, collection_item_key) on delete cascade
);

create table retention_rule (
  policy_revision_id uuid primary key references policy_revision (policy_revision_id) on delete cascade,
  retention_period text not null check (btrim(retention_period) <> '')
);

create function enforce_policy_revision_facts() returns trigger
language plpgsql
as $function$
declare
  target_revision_id uuid;
  no_collection_confirmed boolean;
  retention_status retention_fact_status;
begin
  target_revision_id := case when tg_op = 'DELETE' then old.policy_revision_id else new.policy_revision_id end;

  select revision.no_collection_confirmed, revision.retention_status
    into no_collection_confirmed, retention_status
    from policy_revision as revision
   where revision.policy_revision_id = target_revision_id;

  if not found then
    return null;
  end if;

  if no_collection_confirmed and exists (
    select 1 from collection_item as item where item.policy_revision_id = target_revision_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'no-collection confirmation conflicts with collection items';
  end if;

  if retention_status = 'applies' and not exists (
    select 1 from retention_rule as rule where rule.policy_revision_id = target_revision_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'retention status applies requires a retention rule';
  elsif retention_status <> 'applies' and exists (
    select 1 from retention_rule as rule where rule.policy_revision_id = target_revision_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'retention rule requires retention status applies';
  end if;

  return null;
end;
$function$;

create constraint trigger policy_revision_fact_contract
after insert or update on policy_revision
deferrable initially deferred
for each row execute function enforce_policy_revision_facts();

create constraint trigger collection_item_fact_contract
after insert or update or delete on collection_item
deferrable initially deferred
for each row execute function enforce_policy_revision_facts();

create constraint trigger retention_rule_fact_contract
after insert or update or delete on retention_rule
deferrable initially deferred
for each row execute function enforce_policy_revision_facts();

create function upsert_collection_item(
  input_policy_revision_id uuid,
  input_collection_item_key text,
  input_collection_item_label text,
  input_collection_mode collection_fact_mode default null,
  input_collection_path text default null
) returns collection_item
language sql
as $function$
  insert into collection_item as stored (
    policy_revision_id,
    collection_item_key,
    collection_item_label,
    collection_mode,
    collection_path
  ) values (
    input_policy_revision_id,
    input_collection_item_key,
    input_collection_item_label,
    input_collection_mode,
    input_collection_path
  )
  on conflict (policy_revision_id, collection_item_key) do update
    set collection_item_label = excluded.collection_item_label,
        collection_mode = excluded.collection_mode,
        collection_path = excluded.collection_path
  returning stored.*;
$function$;

commit;
