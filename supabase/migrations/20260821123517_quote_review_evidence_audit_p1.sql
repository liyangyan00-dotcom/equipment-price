create or replace function private.wpi_record_quote_event_impl(
  target_document_id uuid,
  target_item_id uuid default null,
  event_action text default null,
  event_note text default null,
  event_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  quote_document public.wpi_quote_documents;
  quote_item public.wpi_quote_items;
  required_permission public.wpi_app_permission;
  audit_id bigint;
begin
  select * into quote_document
  from public.wpi_quote_documents
  where id = target_document_id;

  if quote_document.id is null then
    raise exception 'Quote document not found';
  end if;

  if target_item_id is not null then
    select * into quote_item
    from public.wpi_quote_items
    where id = target_item_id
      and document_id = quote_document.id;

    if quote_item.id is null then
      raise exception 'Quote item does not belong to the document';
    end if;
  end if;

  if event_action not in (
    'quote.uploaded',
    'quote.upload_failed',
    'quote.source_previewed',
    'quote.source_downloaded',
    'quote.parse_started',
    'quote.parse_completed',
    'quote.parse_failed',
    'quote.ai_review_queued',
    'quote.ai_review_unavailable',
    'quote.fields_saved',
    'quote.needs_info',
    'quote.rejected',
    'quote.voided',
    'quote.imported'
  ) then
    raise exception 'Unsupported quote event';
  end if;

  required_permission := case
    when event_action in ('quote.source_previewed', 'quote.source_downloaded')
      then 'price.read'::public.wpi_app_permission
    when event_action in (
      'quote.needs_info', 'quote.rejected', 'quote.voided', 'quote.imported'
    ) then 'price.review'::public.wpi_app_permission
    else 'price.write'::public.wpi_app_permission
  end;

  if not private.wpi_has_permission(quote_document.organization_id, required_permission) then
    raise exception 'Permission denied for quote event';
  end if;

  if jsonb_typeof(coalesce(event_metadata, '{}'::jsonb)) <> 'object' then
    raise exception 'Event metadata must be a JSON object';
  end if;

  insert into public.wpi_audit_logs (
    organization_id,
    actor_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    request_id
  ) values (
    quote_document.organization_id,
    (select auth.uid()),
    event_action,
    case when target_item_id is null then 'wpi_quote_documents' else 'wpi_quote_items' end,
    coalesce(target_item_id, quote_document.id)::text,
    null,
    jsonb_build_object(
      'documentId', quote_document.id,
      'documentCode', quote_document.document_code,
      'itemId', target_item_id,
      'note', nullif(btrim(event_note), ''),
      'metadata', coalesce(event_metadata, '{}'::jsonb)
    ),
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-request-id'
  ) returning id into audit_id;

  return audit_id;
end;
$$;

revoke all on function private.wpi_record_quote_event_impl(uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function private.wpi_record_quote_event_impl(uuid, uuid, text, text, jsonb)
  to authenticated;

create or replace function public.wpi_record_quote_event(
  target_document_id uuid,
  target_item_id uuid default null,
  event_action text default null,
  event_note text default null,
  event_metadata jsonb default '{}'::jsonb
)
returns bigint
language sql
security invoker
set search_path = ''
as $$
  select private.wpi_record_quote_event_impl(
    target_document_id,
    target_item_id,
    event_action,
    event_note,
    event_metadata
  );
$$;

revoke all on function public.wpi_record_quote_event(uuid, uuid, text, text, jsonb)
  from public, anon;
grant execute on function public.wpi_record_quote_event(uuid, uuid, text, text, jsonb)
  to authenticated;

comment on function public.wpi_record_quote_event(uuid, uuid, text, text, jsonb) is
  'Records organization-scoped quote evidence and review events after explicit permission checks.';

;
