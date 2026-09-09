import { FilePenLine, FileSpreadsheet, Globe2, Network } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PriceCollectionMode } from "@/types/priceCollection";

type SelectableMode = Extract<
  PriceCollectionMode,
  "web" | "api" | "quote_upload" | "manual"
>;

type CollectionPathSelectorProps = {
  mode: SelectableMode;
  webSourceCount: number;
  apiSourceCount: number;
  onChange: (mode: SelectableMode) => void;
};

export function CollectionPathSelector({
  mode,
  webSourceCount,
  apiSourceCount,
  onChange,
}: CollectionPathSelectorProps) {
  const online = mode === "web" || mode === "api";

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[12px] font-black text-textMain">1. 选择采集方式</div>
        <p className="mt-1 text-[11px] leading-5 text-textMuted">
          公开来源走受控采集器，供应商文件走报价识别，线下报价可人工录入。
        </p>
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          aria-pressed={online}
          onClick={() => onChange(mode === "api" ? "api" : "web")}
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-[10px] border px-3 py-3 text-left transition-colors",
            online
              ? "border-primary bg-primary-soft"
              : "border-borderSoft bg-white hover:border-primary/35 hover:bg-page",
          )}
        >
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-primary-soft text-primary">
            <Globe2 className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-black text-textMain">网上采集</span>
            <span className="mt-0.5 block text-[11px] text-textMuted">
              白名单网页与授权 API
            </span>
          </span>
          <span className="whitespace-nowrap text-[10px] font-bold text-primary">
            {webSourceCount + apiSourceCount} 个来源
          </span>
        </button>

        <button
          type="button"
          aria-pressed={mode === "quote_upload"}
          onClick={() => onChange("quote_upload")}
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-[10px] border px-3 py-3 text-left transition-colors",
            mode === "quote_upload"
              ? "border-ai bg-ai-soft"
              : "border-borderSoft bg-white hover:border-ai/35 hover:bg-page",
          )}
        >
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-ai-soft text-ai">
            <FileSpreadsheet className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-black text-textMain">上传报价</span>
            <span className="mt-0.5 block text-[11px] text-textMuted">
              Excel、PDF 与报价图片
            </span>
          </span>
        </button>

        <button
          type="button"
          aria-pressed={mode === "manual"}
          onClick={() => onChange("manual")}
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-[10px] border px-3 py-3 text-left transition-colors",
            mode === "manual"
              ? "border-warning/40 bg-warning/10"
              : "border-borderSoft bg-white hover:border-warning/35 hover:bg-page",
          )}
        >
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-warning/10 text-warning">
            <FilePenLine className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-black text-textMain">人工录入</span>
            <span className="mt-0.5 block text-[11px] text-textMuted">
              电话、邮件与现场询价记录
            </span>
          </span>
        </button>
      </div>

      {online ? (
        <div className="rounded-[9px] bg-page p-1" aria-label="网上采集来源类型">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              aria-pressed={mode === "web"}
              onClick={() => onChange("web")}
              className={cn(
                "inline-flex h-8 items-center justify-center gap-1 rounded-[7px] text-[11px] font-bold",
                mode === "web" ? "bg-white text-primary shadow-sm" : "text-textMuted",
              )}
            >
              <Globe2 className="size-3.5" /> 网页 {webSourceCount}
            </button>
            <button
              type="button"
              aria-pressed={mode === "api"}
              onClick={() => onChange("api")}
              className={cn(
                "inline-flex h-8 items-center justify-center gap-1 rounded-[7px] text-[11px] font-bold",
                mode === "api" ? "bg-white text-primary shadow-sm" : "text-textMuted",
              )}
            >
              <Network className="size-3.5" /> API {apiSourceCount}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
