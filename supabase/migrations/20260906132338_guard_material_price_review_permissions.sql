-- Local pending migration. No historical prices are rewritten.
create or replace function private.wpi_guard_material_price_review()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  can_write boolean;
  can_review boolean;
  business_changed boolean;
  review_changed boolean;
  review_keys text[] := array['reviewDecision','reviewComment','reviewedBy','reviewedAt','needsInformation'];
  note text;
  origin_id uuid;
  decision text;
begin
  if actor is null then
    raise exception 'Authentication required for material price changes' using errcode = '42501';
  end if;
  can_write := private.wpi_has_permission(new.organization_id, 'price.write')
    and private.wpi_has_any_role(new.organization_id, array['admin','manager','editor']::public.wpi_app_role[]);
  can_review := private.wpi_has_permission(new.organization_id, 'price.review')
    and private.wpi_has_any_role(new.organization_id, array['admin','manager','reviewer']::public.wpi_app_role[]);
  if not (can_write or can_review) then
    raise exception 'Insufficient material price permissions' using errcode = '42501';
  end if;
  new.metadata := coalesce(new.metadata, '{}'::jsonb);
  if jsonb_typeof(new.metadata) <> 'object' then
    raise exception 'Material metadata must be an object' using errcode = '22023';
  end if;
  new.updated_by := actor;
  new.updated_at := clock_timestamp();

  if tg_op = 'INSERT' then
    if new.created_by is distinct from actor then
      raise exception 'Material creator must be the authenticated actor' using errcode = '42501';
    end if;
    if new.review_status in ('draft','pending_review') then
      if not can_write then
        raise exception 'Price write permission required' using errcode = '42501';
      end if;
      if coalesce(new.metadata ->> 'reviewDecision', '') <> ''
        or coalesce(new.metadata ->> 'reviewedBy', '') <> ''
        or coalesce(new.metadata ->> 'reviewedAt', '') <> ''
        or coalesce(new.metadata ->> 'reviewComment', '') <> ''
        or coalesce(new.metadata ->> 'needsInformation', 'false') <> 'false' then
        raise exception 'Review metadata requires an explicit human review' using errcode = '42501';
      end if;
      return new;
    end if;
    if new.review_status <> 'approved' or not can_review then
      raise exception 'Only an authorized reviewer can insert an approved price' using errcode = '42501';
    end if;
    note := nullif(btrim(new.metadata ->> 'reviewComment'), '');

    -- Existing human transfer RPCs insert the price before updating the source status.
    -- Source labels or client-supplied actor/timestamp fields are not authorization.
    if new.source_type = 'ai_price_collection' then
      if coalesce(new.metadata ->> 'collectionLeadId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception 'A confirmed collection lead is required' using errcode = '22023';
      end if;
      origin_id := (new.metadata ->> 'collectionLeadId')::uuid;
      select coalesce(nullif(btrim(lead.review_notes), ''), 'Human-confirmed collection lead transfer')
        into note
      from public.wpi_price_collection_leads lead
      where lead.id = origin_id and lead.organization_id = new.organization_id
        and lead.target_type = 'material' and lead.status = 'ready'
        and lead.reviewed_by is not null and lead.reviewed_at is not null;
      if not found then
        raise exception 'A confirmed same-organization material lead is required' using errcode = '42501';
      end if;
    elsif new.source_type = 'ai_quote_recognition' then
      if coalesce(new.metadata ->> 'quoteItemId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception 'A reviewable quote item is required' using errcode = '22023';
      end if;
      origin_id := (new.metadata ->> 'quoteItemId')::uuid;
      perform 1 from public.wpi_quote_items item
        join public.wpi_quote_documents doc on doc.id = item.document_id
          and doc.organization_id = item.organization_id
      where item.id = origin_id and item.organization_id = new.organization_id
        and item.review_status in ('pending_review','needs_info','approved')
        and doc.status in ('needs_review','partially_imported','imported')
        and doc.id::text = new.metadata ->> 'quoteDocumentId';
      if not found then
        raise exception 'A reviewable same-organization quote source is required' using errcode = '42501';
      end if;
      note := coalesce(nullif(btrim(new.metadata ->> 'reviewNote'), ''), 'Human-authorized quote item import');
    end if;
    decision := 'approve';
  else
    if row(new.id,new.organization_id,new.created_by,new.created_at,new.price_code,new.legacy_id)
      is distinct from row(old.id,old.organization_id,old.created_by,old.created_at,old.price_code,old.legacy_id) then
      raise exception 'Material identity and organization are immutable' using errcode = '42501';
    end if;
    if old.review_status = 'archived' then
      raise exception 'Archived material prices are immutable' using errcode = '55000';
    end if;
    business_changed :=
      (to_jsonb(new) - array['metadata','review_status','updated_at','updated_by'])
        is distinct from (to_jsonb(old) - array['metadata','review_status','updated_at','updated_by'])
      or (new.metadata - review_keys) is distinct from (coalesce(old.metadata,'{}'::jsonb) - review_keys);
    review_changed := jsonb_build_array(new.metadata->'reviewDecision',new.metadata->'reviewComment',new.metadata->'reviewedBy',new.metadata->'reviewedAt',new.metadata->'needsInformation')
      is distinct from jsonb_build_array(old.metadata->'reviewDecision',old.metadata->'reviewComment',old.metadata->'reviewedBy',old.metadata->'reviewedAt',old.metadata->'needsInformation');
    if business_changed and not can_write then
      raise exception 'Review-only actors cannot edit material business fields' using errcode = '42501';
    end if;
    if new.review_status in ('approved','rejected','archived') then
      if new.review_status = old.review_status then
        if business_changed or review_changed then
          raise exception 'Finalized prices must return to draft before editing' using errcode = '55000';
        end if;
        return new;
      end if;
      if not can_review then
        raise exception 'Price review permission required' using errcode = '42501';
      end if;
      if business_changed then
        raise exception 'Editing and final review must be separate operations' using errcode = '55000';
      end if;
      if new.review_status <> 'archived' and old.review_status not in ('draft','pending_review') then
        raise exception 'Price is not awaiting review' using errcode = '55000';
      end if;
      decision := case new.review_status when 'approved' then 'approve' when 'rejected' then 'reject' else 'archive' end;
      note := nullif(btrim(new.metadata ->> 'reviewComment'), '');
    elsif new.review_status in ('draft','pending_review') then
      if new.review_status = 'pending_review' and new.metadata ->> 'reviewDecision' = 'need_info'
        and review_changed and not business_changed then
        if not can_review or old.review_status not in ('draft','pending_review') then
          raise exception 'Only an authorized reviewer may request more information' using errcode = '42501';
        end if;
        decision := 'need_info';
        note := nullif(btrim(new.metadata ->> 'reviewComment'), '');
      elsif not business_changed and not review_changed and new.review_status = old.review_status then
        return new;
      else
        if not can_write then
          raise exception 'Price write permission required' using errcode = '42501';
        end if;
        if review_changed and (
          coalesce(new.metadata ->> 'reviewDecision', '') <> ''
          or coalesce(new.metadata ->> 'reviewComment', '') <> ''
          or coalesce(new.metadata ->> 'reviewedBy', '') <> ''
          or coalesce(new.metadata ->> 'reviewedAt', '') <> ''
          or coalesce(new.metadata ->> 'needsInformation', 'false') <> 'false'
        ) then
          raise exception 'Editors cannot forge review metadata' using errcode = '42501';
        end if;
        new.metadata := (new.metadata - review_keys) || jsonb_build_object(
          'reviewDecision',null,'reviewComment',null,'reviewedBy',null,'reviewedAt',null,'needsInformation',false);
        return new;
      end if;
    else
      raise exception 'Unsupported material review state' using errcode = '22023';
    end if;
  end if;
  if note is null then
    raise exception 'A human review comment is required' using errcode = '22023';
  end if;
  new.metadata := (new.metadata - review_keys) || jsonb_build_object(
    'reviewDecision',decision,'reviewComment',left(note,4000),
    'reviewedBy',actor,'reviewedAt',clock_timestamp(),'needsInformation',decision = 'need_info');
  return new;
end;
$$;

revoke all on function private.wpi_guard_material_price_review() from public, anon, authenticated;

-- Run after the existing unit/evidence normalizer and updated_at trigger.
drop trigger if exists wpi_zz_guard_material_review on public.wpi_material_prices;
create trigger wpi_zz_guard_material_review
before insert or update on public.wpi_material_prices
for each row execute function private.wpi_guard_material_price_review();

-- Reviewers need UPDATE for a decision; the trigger limits them to review fields.
drop policy if exists wpi_material_update on public.wpi_material_prices;
create policy wpi_material_update on public.wpi_material_prices
for update to authenticated
using (private.wpi_has_permission(organization_id,'price.write') or private.wpi_has_permission(organization_id,'price.review'))
with check (private.wpi_has_permission(organization_id,'price.write') or private.wpi_has_permission(organization_id,'price.review'));

drop policy if exists wpi_material_delete on public.wpi_material_prices;
create policy wpi_material_delete on public.wpi_material_prices
for delete to authenticated
using (private.wpi_has_permission(organization_id,'price.review')
  and private.wpi_has_any_role(organization_id, array['admin','manager','reviewer']::public.wpi_app_role[]));
