import type { ReactNode } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

type UploadPanelProps = {
  title: string;
  description?: string;
  acceptHint?: string;
  action?: ReactNode;
  className?: string;
};

export function UploadPanel({ title, description, acceptHint, action, className }: UploadPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-primary/30 bg-primary-soft/50 px-6 py-8 text-center",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-card bg-white text-primary shadow-card">
        <UploadCloud className="size-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-card-title text-textMain">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-caption text-textMuted">{description}</p> : null}
      {acceptHint ? <p className="mt-2 text-[12px] text-textMuted">{acceptHint}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
