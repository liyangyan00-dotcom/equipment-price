import { NextRequest, NextResponse } from "next/server";
import { getApiAccess } from "@/lib/auth/apiAccess";

type RouteContext = { params: Promise<{ id: string }> };

async function resolveInquiry(
  access: Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>,
  id: string,
) {
  const query = () =>
    access.supabase
      .from("wpi_inquiries")
      .select("id,inquiry_code,legacy_id,status,risk_level,base_currency,comparison_date")
      .eq("organization_id", access.organizationId);
  let result = await query().eq("legacy_id", id).maybeSingle();
  if (!result.data) result = await query().eq("inquiry_code", id).maybeSingle();
  if (!result.data && /^[0-9a-f-]{36}$/i.test(id))
    result = await query().eq("id", id).maybeSingle();
  return result;
}

type Access = Extract<Awaited<ReturnType<typeof getApiAccess>>, { ok: true }>;

async function resolveExchangeRate(
  access: Access,
  fromCurrency: string,
  toCurrency: string,
  comparisonDate: string,
) {
  if (fromCurrency === toCurrency)
    return { rate: 1, date: comparisonDate, source: "identity", verified: true };

  const stored = await access.supabase
    .from("wpi_exchange_rates")
    .select("rate,rate_date,source,is_verified")
    .eq("organization_id", access.organizationId)
    .eq("base_currency", fromCurrency)
    .eq("quote_currency", toCurrency)
    .lte("rate_date", comparisonDate)
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (stored.error) throw new Error(stored.error.message);
  if (stored.data) {
    return {
      rate: Number(stored.data.rate),
      date: stored.data.rate_date,
      source: stored.data.source,
      verified: Boolean(stored.data.is_verified),
    };
  }

  const endpoint = new URL(
    `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(fromCurrency)}/${encodeURIComponent(toCurrency)}`,
  );
  endpoint.searchParams.set("date", comparisonDate);
  endpoint.searchParams.set("providers", "ECB");
  let response = await fetch(endpoint, { cache: "no-store" });
  let payload = (await response.json().catch(() => null)) as
    | {
        rate?: number;
        date?: string;
        message?: string;
        providers?: Array<{ key?: string; date?: string; rate?: number }>;
      }
    | null;
  let rateSource = "Frankfurter:ECB";
  if (!response.ok || !payload?.rate) {
    endpoint.searchParams.delete("providers");
    endpoint.searchParams.set("expand", "providers");
    response = await fetch(endpoint, { cache: "no-store" });
    payload = (await response.json().catch(() => null)) as typeof payload;
    const providers = [...new Set(
      (payload?.providers ?? [])
        .map((provider) => provider.key?.trim())
        .filter((key): key is string => Boolean(key)),
    )];
    rateSource = providers.length
      ? `Frankfurter:${providers.join("+")}`
      : "Frankfurter:blended";
  }
  if (!response.ok || !payload?.rate)
    throw new Error(
      `缺少 ${fromCurrency}/${toCurrency} 在 ${comparisonDate} 的可核验参考汇率`,
    );
  const snapshot = {
    organization_id: access.organizationId,
    base_currency: fromCurrency,
    quote_currency: toCurrency,
    rate: Number(payload.rate),
    rate_date: payload.date || comparisonDate,
    source: rateSource,
    is_verified: true,
    metadata: { endpoint: endpoint.toString(), fetchedAt: new Date().toISOString() },
    created_by: access.userId,
  };
  const saved = await access.supabase
    .from("wpi_exchange_rates")
    .upsert(snapshot, {
      onConflict: "organization_id,base_currency,quote_currency,rate_date,source",
    });
  if (saved.error) throw new Error(saved.error.message);
  return {
    rate: snapshot.rate,
    date: snapshot.rate_date,
    source: snapshot.source,
    verified: true,
  };
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const access = await getApiAccess();
  if (!access.ok)
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  if (!["admin", "manager", "editor", "reviewer"].includes(access.role))
    return NextResponse.json(
      { error: "当前角色没有生成比价结果的权限" },
      { status: 403 },
    );
  const inquiry = await resolveInquiry(access, (await context.params).id);
  if (inquiry.error)
    return NextResponse.json({ error: inquiry.error.message }, { status: 500 });
  if (!inquiry.data)
    return NextResponse.json({ error: "询价任务不存在" }, { status: 404 });

  const responses = await access.supabase
    .from("wpi_inquiry_suppliers")
    .select(
      "supplier_id,quoted_amount,currency,responded_at,risk_level,metadata,wpi_suppliers(name)",
    )
    .eq("organization_id", access.organizationId)
    .eq("inquiry_id", inquiry.data.id)
    .not("quoted_amount", "is", null);
  if (responses.error)
    return NextResponse.json(
      { error: responses.error.message },
      { status: 500 },
    );
  const quoted = (responses.data ?? []).filter(
    (row) => Number(row.quoted_amount) > 0,
  );
  if (quoted.length < 2)
    return NextResponse.json(
      { error: "至少需要 2 家供应商的真实报价才能生成比价结果" },
      { status: 409 },
    );
  const baseCurrency = (inquiry.data.base_currency || "USD").toUpperCase();
  const comparisonDate = inquiry.data.comparison_date || new Date().toISOString().slice(0, 10);
  let normalized: Array<(typeof quoted)[number] & {
    normalizedAmount: number;
    exchangeRate: number;
    exchangeRateDate: string;
    exchangeRateSource: string;
    exchangeRateVerified: boolean;
  }>;
  try {
    normalized = await Promise.all(
      quoted.map(async (row) => {
        const sourceCurrency = (row.currency || baseCurrency).toUpperCase();
        const fx = await resolveExchangeRate(
          access,
          sourceCurrency,
          baseCurrency,
          comparisonDate,
        );
        return {
          ...row,
          normalizedAmount: Number(row.quoted_amount) * fx.rate,
          exchangeRate: fx.rate,
          exchangeRateDate: fx.date,
          exchangeRateSource: fx.source,
          exchangeRateVerified: fx.verified,
        };
      }),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "汇率折算失败" },
      { status: 409 },
    );
  }
  const itemQuoteResult = await access.supabase
    .from("wpi_inquiry_item_quotes")
    .select("supplier_id,delivery_days,technical_deviation,commercial_deviation")
    .eq("organization_id", access.organizationId)
    .eq("inquiry_id", inquiry.data.id);
  if (itemQuoteResult.error)
    return NextResponse.json({ error: itemQuoteResult.error.message }, { status: 500 });
  const itemQuotesBySupplier = new Map<string, typeof itemQuoteResult.data>();
  for (const item of itemQuoteResult.data ?? []) {
    const values = itemQuotesBySupplier.get(item.supplier_id) ?? [];
    values.push(item);
    itemQuotesBySupplier.set(item.supplier_id, values);
  }

  const sorted = [...normalized].sort(
    (a, b) => a.normalizedAmount - b.normalizedAmount,
  );
  const low = sorted[0].normalizedAmount;
  const high = sorted.at(-1)?.normalizedAmount ?? low;
  const comparisonCode = `CMP-${inquiry.data.inquiry_code.replace(/^INQ-/, "")}`;
  const head = await access.supabase
    .from("wpi_comparisons")
    .upsert(
      {
        organization_id: access.organizationId,
        inquiry_id: inquiry.data.id,
        comparison_code: comparisonCode,
        status: "needs_review",
        currency: baseCurrency,
        base_currency: baseCurrency,
        comparison_date: comparisonDate,
        lowest_amount: low,
        highest_amount: high,
        spread_rate: low > 0 ? ((high - low) / low) * 100 : 0,
        recommended_supplier_id: sorted[0].supplier_id,
        ai_confidence: Math.min(95, 70 + quoted.length * 5),
        risk_level: inquiry.data.risk_level,
        summary: `基于 ${quoted.length} 家供应商真实逐项/汇总报价生成，按 ${comparisonDate} 参考汇率折算至 ${baseCurrency}，最低折算报价 ${low.toLocaleString()} ${baseCurrency}。`,
        metadata: {
          source: "real_supplier_quotes",
          generatedAt: new Date().toISOString(),
          humanReviewRequired: true,
          exchangeRateVerified: normalized.every((row) => row.exchangeRateVerified),
        },
        created_by: access.userId,
        updated_by: access.userId,
      },
      { onConflict: "organization_id,inquiry_id" },
    )
    .select("id,comparison_code")
    .single();
  if (head.error)
    return NextResponse.json({ error: head.error.message }, { status: 500 });

  const deleteExisting = await access.supabase
    .from("wpi_comparison_quotes")
    .delete()
    .eq("comparison_id", head.data.id);
  if (deleteExisting.error)
    return NextResponse.json(
      { error: deleteExisting.error.message },
      { status: 500 },
    );
  const inquiryId = inquiry.data.id;
  const rows = sorted.map((row, index) => {
    const amount = Number(row.quoted_amount);
    const priceScore = Math.max(50, Math.round((low / row.normalizedAmount) * 100));
    const riskPenalty =
      row.risk_level === "critical"
        ? 30
        : row.risk_level === "high"
          ? 20
          : row.risk_level === "medium"
            ? 10
            : 0;
    const itemQuotes = itemQuotesBySupplier.get(row.supplier_id) ?? [];
    const averageDelivery = itemQuotes.length
      ? itemQuotes.reduce((sum, item) => sum + Number(item.delivery_days ?? 60), 0) / itemQuotes.length
      : null;
    const technicalDeviationCount = itemQuotes.filter((item) => item.technical_deviation?.trim()).length;
    const commercialDeviationCount = itemQuotes.filter((item) => item.commercial_deviation?.trim()).length;
    const deliveryScore = averageDelivery == null ? (row.responded_at ? 80 : 60) : Math.max(55, 100 - averageDelivery);
    const technicalScore = Math.max(50, 94 - riskPenalty - technicalDeviationCount * 8);
    const adjustedCommercialScore = Math.max(45, priceScore - commercialDeviationCount * 6);
    const totalScore = Math.round(
      adjustedCommercialScore * 0.55 + technicalScore * 0.25 + deliveryScore * 0.2,
    );
    return {
      organization_id: access.organizationId,
      comparison_id: head.data.id,
      inquiry_id: inquiryId,
      supplier_id: row.supplier_id,
      quoted_amount: amount,
      currency: row.currency || baseCurrency,
      normalized_amount: row.normalizedAmount,
      exchange_rate: row.exchangeRate,
      exchange_rate_date: row.exchangeRateDate,
      exchange_rate_source: row.exchangeRateSource,
      rank: index + 1,
      commercial_score: adjustedCommercialScore,
      technical_score: technicalScore,
      delivery_score: deliveryScore,
      total_score: totalScore,
      ai_recommendation:
        index === 0
          ? "价格最优，建议优先进入人工商务评审。"
          : "保留为备选，需结合技术偏差与交期人工确认。",
      risk_level: row.risk_level,
      is_recommended: index === 0,
      metadata: {
        sourceRespondedAt: row.responded_at,
        sourceSupplierMetadata: row.metadata,
        technicalDeviationCount,
        commercialDeviationCount,
        averageDeliveryDays: averageDelivery,
        exchangeRateVerified: row.exchangeRateVerified,
      },
    };
  });
  const quotes = await access.supabase
    .from("wpi_comparison_quotes")
    .insert(rows)
    .select("*");
  if (quotes.error)
    return NextResponse.json({ error: quotes.error.message }, { status: 500 });
  await access.supabase.from("wpi_inquiry_events").insert({
    organization_id: access.organizationId,
    inquiry_id: inquiryId,
    event_type: "comparison_generated",
    event_status: "completed",
    actor_id: access.userId,
    payload: {
      comparisonId: head.data.id,
      comparisonCode,
      quoteCount: rows.length,
    },
  });
  return NextResponse.json(
    { data: { ...head.data, quotes: quotes.data }, source: "supabase" },
    { status: 201 },
  );
}
