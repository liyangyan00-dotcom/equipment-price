create index if not exists wpi_equipment_prices_deleted_by_idx
         on public.wpi_equipment_prices (deleted_by)
         where deleted_by is not null;;
