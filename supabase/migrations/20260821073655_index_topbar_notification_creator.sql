create index wpi_notifications_created_by_idx
  on public.wpi_notifications (created_by)
  where created_by is not null;

;
