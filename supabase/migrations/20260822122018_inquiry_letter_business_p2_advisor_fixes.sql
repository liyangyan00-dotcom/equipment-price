create index if not exists wpi_inquiry_letter_templates_created_by_idx
  on public.wpi_inquiry_letter_templates (created_by);

create index if not exists wpi_inquiry_letter_templates_updated_by_idx
  on public.wpi_inquiry_letter_templates (updated_by);

create index if not exists wpi_inquiry_export_jobs_inquiry_id_idx
  on public.wpi_inquiry_export_jobs (inquiry_id);

create index if not exists wpi_inquiry_export_jobs_requested_by_idx
  on public.wpi_inquiry_export_jobs (requested_by);

drop policy if exists wpi_inquiry_letter_templates_write
  on public.wpi_inquiry_letter_templates;

create policy wpi_inquiry_letter_templates_write
  on public.wpi_inquiry_letter_templates for insert to authenticated
  with check (
    private.wpi_has_permission(organization_id, 'inquiry.write')
    and created_by = (select auth.uid())
  );

drop policy if exists wpi_inquiry_export_jobs_write
  on public.wpi_inquiry_export_jobs;

create policy wpi_inquiry_export_jobs_write
  on public.wpi_inquiry_export_jobs for insert to authenticated
  with check (
    private.wpi_has_permission(organization_id, 'inquiry.write')
    and requested_by = (select auth.uid())
  );;
