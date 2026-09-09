create index wpi_dictionary_items_created_by_idx
  on public.wpi_dictionary_items(created_by);

create index wpi_dictionary_items_updated_by_idx
  on public.wpi_dictionary_items(updated_by)
  where updated_by is not null;
