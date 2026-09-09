update public.wpi_equipment_collection_discoveries
set status = 'blocked',
    error_message = '来源需要登录或授权，当前采集凭证不可用',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'authRequired', true,
      'blockedReason', 'authentication_required'
    ),
    updated_at = now()
where status = 'fetched'
  and resource_url ~* '/download(?:/|$)'
  and coalesce(metadata ->> 'canonicalUrl', '') ~* '/(?:user/)?(?:login|signin)(?:[/?#]|$)';
