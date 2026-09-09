update public.wpi_integrations
set
  provider = 'Resend',
  endpoint_url = 'https://api.resend.com',
  description = '通过 Resend 发送询价函、供应商催办与报告通知，并接收送达、打开、退信和供应商回函事件。',
  config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
    'transport', 'resend',
    'webhookUrl', 'https://tkyvafheqyshbjqnzbgq.supabase.co/functions/v1/wpi-inquiry-email-webhook',
    'humanReview', true
  ),
  updated_at = now()
where integration_code = 'SMTP_OUTBOUND'
  and provider = 'SMTP'
  and credential_state = 'missing';
