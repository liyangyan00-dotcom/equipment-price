create index if not exists wpi_attachment_tags_org_idx on public.wpi_attachment_tags (organization_id);
create index if not exists wpi_attachment_tags_created_by_idx on public.wpi_attachment_tags (created_by);
create index if not exists wpi_attachment_issues_org_idx on public.wpi_attachment_issues (organization_id);
create index if not exists wpi_attachment_issues_created_by_idx on public.wpi_attachment_issues (created_by);
create index if not exists wpi_attachment_issues_resolved_by_idx on public.wpi_attachment_issues (resolved_by) where resolved_by is not null;
create index if not exists wpi_attachment_reviews_org_idx on public.wpi_attachment_reviews (organization_id);
create index if not exists wpi_attachment_reviews_reviewer_idx on public.wpi_attachment_reviews (reviewer_id);
create index if not exists wpi_attachment_ai_runs_org_idx on public.wpi_attachment_ai_runs (organization_id);
create index if not exists wpi_attachment_ai_runs_requested_by_idx on public.wpi_attachment_ai_runs (requested_by);;
