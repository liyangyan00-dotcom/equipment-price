do $migration$
declare
  function_definition text;
  updated_definition text;
begin
  select pg_get_functiondef(
    'private.wpi_capture_automation_component_states()'::regprocedure
  ) into function_definition;

  updated_definition := replace(
    function_definition,
    $old$case when item ->> 'status' = 'active' then 'healthy' else 'warning' end,
        coalesce(item ->> 'lastError', '外部集成连接正常'),$old$,
    $new$case when item ->> 'status' in ('active', 'disabled') then 'healthy' else 'warning' end,
        case
          when item ->> 'status' = 'disabled' then '备用集成未启用，不参与当前自动化运行'
          else coalesce(item ->> 'lastError', '外部集成连接正常')
        end,$new$
  );

  updated_definition := replace(
    updated_definition,
    $old$when coalesce(item ->> 'lastStatus', 'missing') <> 'succeeded' then 'warning'
          else 'healthy'$old$,
    $new$else 'healthy'$new$
  );

  updated_definition := replace(
    updated_definition,
    $old$when coalesce(item ->> 'lastStatus', 'missing') <> 'succeeded' then '计划任务尚无成功运行记录'
          else '计划任务调度正常'$old$,
    $new$when item ->> 'lastStatus' is null then '计划任务已启用，等待首次调度记录'
          else '计划任务调度正常'$new$
  );

  if updated_definition = function_definition then
    raise exception 'Unable to refine component assurance states';
  end if;

  execute updated_definition;
end;
$migration$;

comment on function private.wpi_capture_automation_component_states() is
  'Tracks consecutive component failures and recoveries; optional disabled integrations and active jobs awaiting their first run are not incidents.';


