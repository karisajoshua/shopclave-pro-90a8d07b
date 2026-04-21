import { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  count?: number;
  countLabel?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export const AdminPageHeader = ({ title, subtitle, count, countLabel, actions, children }: AdminPageHeaderProps) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-5">
    <div className="space-y-1">
      <div className="flex items-baseline gap-2.5">
        <h2 className="admin-page-title">{title}</h2>
        {typeof count === "number" && (
          <span className="text-sm font-medium text-muted-foreground">
            {count.toLocaleString()}{countLabel ? ` ${countLabel}` : ""}
          </span>
        )}
      </div>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      {children}
      {actions}
    </div>
  </div>
);

export default AdminPageHeader;
