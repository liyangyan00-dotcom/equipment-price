create or replace function private.wpi_prepare_price_lead_translation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.original_name := coalesce(nullif(new.original_name, ''), new.name);
  new.original_specification := coalesce(
    nullif(new.original_specification, ''),
    new.specification
  );

  if coalesce(new.name, '') ~ '[一-龥]' then
    new.translated_name := coalesce(nullif(new.translated_name, ''), new.name);
    if coalesce(new.specification, '') ~ '[一-龥]' then
      new.translated_specification := coalesce(
        nullif(new.translated_specification, ''),
        new.specification
      );
    end if;
    if tg_op = 'INSERT' or new.translation_status in ('queued', 'failed') then
      new.translation_status := 'not_required';
      new.translation_review_status := 'approved';
    end if;
  elsif tg_op = 'INSERT' then
    new.translation_status := 'queued';
    new.translation_review_status := 'pending_review';
  elsif new.name is distinct from old.name
    and new.translation_review_status <> 'approved' then
    new.translation_status := 'queued';
    new.translation_review_status := 'pending_review';
  end if;

  return new;
end;
$$;

drop trigger if exists wpi_price_leads_prepare_translation
on public.wpi_price_collection_leads;
create trigger wpi_price_leads_prepare_translation
before insert or update of name, specification
on public.wpi_price_collection_leads
for each row execute function private.wpi_prepare_price_lead_translation();

update public.wpi_price_collection_leads
set translation_review_status = 'approved'
where translation_status = 'not_required'
  and translation_review_status = 'pending_review';

;
