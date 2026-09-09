"use client";

import { useParams } from "next/navigation";
import { MaterialPriceForm } from "@/components/material-workflow/MaterialPriceForm";

export default function MaterialPriceEditPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <MaterialPriceForm mode="edit" materialId={id ?? ""} />;
}
