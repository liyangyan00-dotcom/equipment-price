create index if not exists wpi_attachments_uploaded_by_idx
  on public.wpi_attachments (uploaded_by);

drop policy if exists wpi_attachments_write on public.wpi_attachments;
create policy wpi_attachments_write on public.wpi_attachments
for insert to authenticated
with check (
  private.wpi_has_permission(organization_id, 'file.write')
  and uploaded_by = (select auth.uid())
);
