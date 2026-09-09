# Supplier quote portal

Static public portal for token-scoped supplier quote submission. It calls the
`wpi-supplier-quote-portal` Supabase Edge Function and contains no service-role
credential or back-office session.

Deploy the directory as a Vercel static project, then set the resulting HTTPS
origin as `SMTP_OUTBOUND.config.publicAppUrl`.
