-- All source tables have organization-scoped RLS. Run with the caller's
-- privileges so the audit reader keeps RLS as a second authorization layer.
alter function public.wpi_get_ai_audit_runs(uuid) security invoker;

revoke all on function public.wpi_get_ai_audit_runs(uuid) from public, anon;
grant execute on function public.wpi_get_ai_audit_runs(uuid) to authenticated;

comment on function public.wpi_get_ai_audit_runs(uuid) is
  'Returns organization-scoped AI execution evidence to authenticated members with audit.read permission and source-table RLS enforcement.';
