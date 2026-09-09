import { NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

export async function GET() {
  const access = await getApiAccess();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data, error } = await access.supabase
    .from("wpi_suppliers")
    .select("*, wpi_supplier_contacts(name, phone, whatsapp, email, is_primary)")
    .eq("organization_id", access.organizationId)
    .order("supplier_code", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    source: "supabase",
    organizationId: access.organizationId,
  });
}
