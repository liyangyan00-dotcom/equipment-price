import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import { PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  image?: StaticImageData | string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, image, primaryAction, secondaryAction, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-card border border-borderSoft bg-card px-6 py-10 text-center shadow-card", className)}>
      {image ? (
        <Image src={image} alt="" width={184} height={144} className="mb-5 h-auto w-[184px] object-contain" />
      ) : (
        <div className="mb-5 flex size-16 items-center justify-center rounded-card bg-primary-soft text-primary">
          <PackageOpen className="size-8" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-[16px] font-semibold leading-6 text-textMain">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-[13px] leading-6 text-textMuted">{description}</p> : null}
      {(primaryAction || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
