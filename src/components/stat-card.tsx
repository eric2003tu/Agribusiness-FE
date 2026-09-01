import type { LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconWrap = cva(
  "flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
  {
    variants: {
      tone: {
        brand: "bg-primary text-primary-foreground",
        soft: "bg-primary-soft text-primary",
        success: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground",
        danger: "bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: { tone: "soft" },
  },
);

export interface StatCardProps extends VariantProps<typeof iconWrap> {
  icon: LucideIcon;
  title: string;
  value: string | number;
  hint?: string | undefined;
  trend?: { value: string; positive?: boolean | undefined } | undefined;
  className?: string | undefined;
}

export function StatCard({ icon: Icon, title, value, hint, trend, tone, className }: StatCardProps) {
  return (
    <div className={cn("surface-card group p-5 transition-shadow hover:shadow-lg", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn(iconWrap({ tone }))}>
          <Icon className="size-5" />
        </div>
      </div>
      {trend && (
        <p
          className={cn(
            "mt-4 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            trend.positive
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {trend.value}
        </p>
      )}
    </div>
  );
}
