create or replace function private.wpi_guard_finalized_equipment_review()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status in ('approved', 'rejected', 'archived') then
    raise exception 'Review task is already finalized';
  end if;

  return new;
end;
$$;

drop trigger if exists wpi_equipment_price_reviews_guard_finalized
on public.wpi_equipment_price_reviews;

create trigger wpi_equipment_price_reviews_guard_finalized
before update on public.wpi_equipment_price_reviews
for each row
execute function private.wpi_guard_finalized_equipment_review();;
