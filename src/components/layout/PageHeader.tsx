import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-card border border-borderSoft bg-card px-6 py-5 shadow-card lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-page-title text-textMain">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-page-subtitle text-textMuted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex max-w-full flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
    </div>
  );
}
