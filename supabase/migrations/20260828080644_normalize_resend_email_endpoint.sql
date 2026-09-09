
update public.wpi_integrations
set endpoint_url = 'https://api.resend.com/emails'
where integration_type = 'email'
  and provider ilike '%resend%'
  and rtrim(coalesce(endpoint_url, ''), '/') = 'https://api.resend.com';
;
