alter table public.wpi_equipment_collection_discoveries
  drop constraint if exists wpi_equipment_collection_disc_organization_id_source_id_url_key;

alter table public.wpi_equipment_collection_discoveries
  add constraint wpi_equipment_collection_disc_org_task_source_url_key
  unique (organization_id, task_id, source_id, url_hash);;
