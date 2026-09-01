import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Budget, BudgetStatus } from "@/lib/mock-data";

const STATUS_LABEL: Record<BudgetStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  queried: "Queried",
};

const STATUS_COLOR: Record<BudgetStatus, string> = {
  pending: "var(--muted-foreground)",
  approved: "var(--success)",
  rejected: "var(--destructive)",
  queried: "var(--warning)",
};

const statusConfig: ChartConfig = Object.fromEntries(
  (Object.keys(STATUS_LABEL) as BudgetStatus[]).map((s) => [
    s,
    { label: STATUS_LABEL[s], color: STATUS_COLOR[s] },
  ]),
);

const givenConfig: ChartConfig = {
  amount: { label: "Money given (RWF)", color: "var(--primary)" },
};

export interface MoneyGivenPoint {
  month: string;
  amount: number;
}

interface FinanceChartsProps {
  budgets: Budget[];
  moneyGivenByMonth: MoneyGivenPoint[];
}

export function FinanceCharts({ budgets, moneyGivenByMonth }: FinanceChartsProps) {
  const statusData = useMemo(
    () =>
      (Object.keys(STATUS_LABEL) as BudgetStatus[])
        .map((status) => ({
          status,
          label: STATUS_LABEL[status],
          count: budgets.filter((b) => b.status === status).length,
        }))
        .filter((d) => d.count > 0),
    [budgets],
  );

  const hasGivenData = moneyGivenByMonth.some((d) => d.amount > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Budget status breakdown</h3>
        <p className="text-xs text-muted-foreground">{budgets.length} requests visible to you</p>
        {statusData.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No budgets to chart.</p>
        ) : (
          <ChartContainer config={statusConfig} className="mx-auto mt-2 aspect-square max-h-64">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
              <Pie
                data={statusData}
                dataKey="count"
                nameKey="status"
                innerRadius={55}
                strokeWidth={2}
              >
                {statusData.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLOR[entry.status]} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="status" />} />
            </PieChart>
          </ChartContainer>
        )}
      </div>

      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Money given by month</h3>
        <p className="text-xs text-muted-foreground">
          Disbursed budgets plus approved material-request payments
        </p>
        {!hasGivenData ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Nothing disbursed yet.</p>
        ) : (
          <ChartContainer config={givenConfig} className="mt-2 max-h-64 w-full">
            <BarChart data={moneyGivenByMonth}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)}M`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => `${Number(value).toLocaleString()} RWF`}
                  />
                }
              />
              <Bar dataKey="amount" fill="var(--primary)" radius={4} maxBarSize={40} />
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
