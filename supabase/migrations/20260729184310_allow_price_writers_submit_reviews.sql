drop policy if exists wpi_equipment_price_reviews_insert
  on public.wpi_equipment_price_reviews;

create policy wpi_equipment_price_reviews_insert
on public.wpi_equipment_price_reviews
for insert
to authenticated
with check (
  (
    private.wpi_has_permission(organization_id, 'price.write')
    or private.wpi_has_permission(organization_id, 'price.review')
  )
  and submitted_by = auth.uid()
);;
