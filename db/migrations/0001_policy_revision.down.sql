begin;

drop function upsert_collection_item(uuid, text, text, collection_fact_mode, text);
drop table processing_purpose, retention_rule, collection_item, service_profile, policy_revision;
drop function enforce_policy_revision_facts();
drop type collection_fact_mode;
drop type retention_fact_status;

commit;
