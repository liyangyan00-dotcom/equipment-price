
revoke all on function public.wpi_review_suppliers(
  uuid[],
  public.wpi_review_status,
  text
) from public;

revoke all on function public.wpi_review_suppliers(
  uuid[],
  public.wpi_review_status,
  text
) from anon;

grant execute on function public.wpi_review_suppliers(
  uuid[],
  public.wpi_review_status,
  text
) to authenticated;
;
