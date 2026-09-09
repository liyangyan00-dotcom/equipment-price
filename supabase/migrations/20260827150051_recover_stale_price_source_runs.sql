create or replace function public.wpi_claim_due_price_collection_source_runs(batch_size integer default 3)
returns setof public.wpi_price_collection_source_runs
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  with ranked as (
    select
      source_run.id,
      row_number() over (
        partition by source_run.organization_id, source_run.source_host
        order by source_run.next_run_at, source_run.created_at
      ) as host_rank
    from public.wpi_price_collection_source_runs source_run
    where (
        source_run.status in ('queued', 'partial')
        and source_run.next_run_at <= now()
        or source_run.status = 'running'
        and source_run.updated_at <= now() - interval '5 minutes'
      )
      and source_run.attempt < source_run.max_retries
      and not exists (
        select 1
        from public.wpi_price_collection_source_runs active_run
        where active_run.organization_id = source_run.organization_id
          and active_run.source_host = source_run.source_host
          and active_run.status = 'running'
          and active_run.id <> source_run.id
          and active_run.updated_at > now() - interval '5 minutes'
      )
  ), candidates as (
    select source_run.id
    from public.wpi_price_collection_source_runs source_run
    join ranked on ranked.id = source_run.id and ranked.host_rank = 1
    order by source_run.next_run_at, source_run.created_at
    for update of source_run skip locked
    limit greatest(1, least(coalesce(batch_size, 3), 8))
  )
  update public.wpi_price_collection_source_runs source_run
  set status = 'running',
      attempt = source_run.attempt + 1,
      started_at = now(),
      finished_at = null,
      error_message = null
  from candidates
  where source_run.id = candidates.id
  returning source_run.*;
end;
$$;

revoke all on function public.wpi_claim_due_price_collection_source_runs(integer)
from public, anon, authenticated;
grant execute on function public.wpi_claim_due_price_collection_source_runs(integer)
to service_role;;
