alter table public.wpi_quote_documents
  add column page_count integer check (page_count is null or page_count > 0),
  add column recognition_method text check (
    recognition_method is null or recognition_method in (
      'spreadsheet', 'openai_responses_pdf', 'openai_responses_vision', 'manual'
    )
  ),
  add column recognition_provider text,
  add column recognition_model text,
  add column processed_at timestamptz;

create table public.wpi_quote_item_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.wpi_organizations(id) on delete cascade,
  document_id uuid not null references public.wpi_quote_documents(id) on delete cascade,
  item_id uuid not null references public.wpi_quote_items(id) on delete cascade,
  page_number integer not null default 1 check (page_number > 0),
  source_kind text not null check (source_kind in ('spreadsheet_row', 'pdf_page', 'image')),
  extraction_method text not null check (
    extraction_method in ('spreadsheet', 'openai_responses', 'manual')
  ),
  source_text text not null default '' check (length(source_text) <= 4000),
  bbox_x numeric(8, 6) not null default 0 check (bbox_x between 0 and 1),
  bbox_y numeric(8, 6) not null default 0 check (bbox_y between 0 and 1),
  bbox_width numeric(8, 6) not null default 1 check (bbox_width > 0 and bbox_width <= 1),
  bbox_height numeric(8, 6) not null default 1 check (bbox_height > 0 and bbox_height <= 1),
  confidence numeric(5, 2) not null check (confidence between 0 and 100),
  provider text,
  model text,
  is_primary boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint wpi_quote_item_evidence_bbox_x check (bbox_x + bbox_width <= 1.000001),
  constraint wpi_quote_item_evidence_bbox_y check (bbox_y + bbox_height <= 1.000001),
  constraint wpi_quote_item_evidence_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create unique index wpi_quote_item_evidence_primary_idx
  on public.wpi_quote_item_evidence(item_id)
  where is_primary;
create index wpi_quote_item_evidence_document_page_idx
  on public.wpi_quote_item_evidence(document_id, page_number, item_id);
create index wpi_quote_item_evidence_org_created_idx
  on public.wpi_quote_item_evidence(organization_id, created_at desc);

create trigger wpi_quote_item_evidence_audit
after insert or update or delete on public.wpi_quote_item_evidence
for each row execute function private.wpi_audit_row_change();

alter table public.wpi_quote_item_evidence enable row level security;

create policy wpi_quote_item_evidence_read
on public.wpi_quote_item_evidence for select to authenticated
using (private.wpi_has_permission(organization_id, 'price.read'));

create policy wpi_quote_item_evidence_insert
on public.wpi_quote_item_evidence for insert to authenticated
with check (
  private.wpi_has_permission(organization_id, 'price.write')
  and created_by = (select auth.uid())
);

create policy wpi_quote_item_evidence_update
on public.wpi_quote_item_evidence for update to authenticated
using (
  private.wpi_has_permission(organization_id, 'price.write')
  or private.wpi_has_permission(organization_id, 'price.review')
)
with check (
  private.wpi_has_permission(organization_id, 'price.write')
  or private.wpi_has_permission(organization_id, 'price.review')
);

create policy wpi_quote_item_evidence_delete
on public.wpi_quote_item_evidence for delete to authenticated
using (
  private.wpi_has_permission(organization_id, 'price.write')
  or private.wpi_has_permission(organization_id, 'price.review')
);

revoke all on public.wpi_quote_item_evidence from public, anon, authenticated;
grant select, insert, update, delete on public.wpi_quote_item_evidence to authenticated;
grant select, insert, update, delete on public.wpi_quote_item_evidence to service_role;

comment on table public.wpi_quote_item_evidence is
  'Immutable source anchors for quote line items. Coordinates are normalized to 0..1 and AI evidence always requires human review.';
comment on column public.wpi_quote_item_evidence.source_text is
  'Original line fragment retained as evidence; it must not be silently replaced by normalized business data.';

;
