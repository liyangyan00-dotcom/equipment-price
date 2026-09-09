"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { InquiryDetailView } from "@/components/inquiries/InquiryDetailView";
import { AppLayout } from "@/components/layout/AppLayout";
import type { InquiryDetail } from "@/data/mock/inquiryDetails";

export default function InquiryDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const [detail, setDetail] = useState<InquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    fetch(`/api/inquiries/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as { detail?: InquiryDetail; error?: string };
        if (!response.ok || !payload.detail) throw new Error(payload.error || "询价任务读取失败");
        return payload.detail;
      })
      .then((nextDetail) => {
        if (active) {
          setDetail(nextDetail);
          setError("");
        }
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "询价任务读取失败"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, reloadToken]);

  if (loading && !detail) {
    return <AppLayout><div className="rounded-card border border-borderSoft bg-white p-10 text-center text-[13px] text-textMuted">正在加载真实询价档案...</div></AppLayout>;
  }
  if (error || !detail) {
    return (
      <AppLayout>
        <div className="rounded-card border border-danger/20 bg-danger-soft p-8 text-center">
          <div className="text-[15px] font-bold text-danger">询价任务加载失败</div>
          <p className="mt-2 text-[12px] text-textSecondary">{error || "未找到该询价任务"}</p>
          <button type="button" onClick={() => { setLoading(true); setError(""); setReloadToken((value) => value + 1); }} className="mt-4 h-9 rounded-lg bg-primary px-4 text-[12px] font-bold text-white">重新加载</button>
        </div>
      </AppLayout>
    );
  }
  const detailKey = [
    detail.id,
    detail.items.map((item) => item.targetId).join(","),
    detail.suppliers.map((supplier) => supplier.supplierId).join(","),
  ].join("|");

  return (
    <AppLayout>
      <InquiryDetailView key={detailKey} detail={detail} onRefresh={() => setReloadToken((value) => value + 1)} />
    </AppLayout>
  );
}
