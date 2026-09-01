import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useWorkspace } from "@/lib/workspace-store";
import { formatRwf } from "@/lib/format";
import { DISTRICTS, locationById, productById, products } from "@/lib/mock-data";

export const Route = createFileRoute("/market-prices")({
  head: () => ({
    meta: [
      { title: "Market prices — Agribridge" },
      { name: "description", content: "Recent transaction and survey prices per product, per district." },
    ],
  }),
  component: MarketPricesPage,
});

const produceProducts = products.filter((p) => p.type === "produce");

function MarketPricesPage() {
  const { marketPriceRecords, addManualPriceRecord, can } = useWorkspace();
  const [productId, setProductId] = useState(produceProducts[0]?.id ?? "");
  const [surveyDistrictId, setSurveyDistrictId] = useState(DISTRICTS[0]?.id ?? "");
  const [surveyPrice, setSurveyPrice] = useState("");

  const rows = useMemo(
    () =>
      marketPriceRecords
        .filter((r) => r.productId === productId)
        .sort((a, b) => b.sampleDate.localeCompare(a.sampleDate)),
    [marketPriceRecords, productId],
  );

  const chartData = rows.map((r) => ({
    district: locationById(r.districtId)?.name ?? r.districtId,
    avgPrice: r.avgPrice,
  }));

  return (
    <AppShell title="Market prices" description="Recent average prices per product and district.">
      <div className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-2">
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {produceProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {chartData.length > 0 ? (
          <ChartContainer
            config={{ avgPrice: { label: "Avg price (RWF)", color: "var(--chart-1)" } }}
            className="mt-6 h-64 w-full"
          >
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="district" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={40} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="avgPrice" fill="var(--color-avgPrice)" radius={4} />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">No price records for this product yet.</p>
        )}
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">District</th>
                <th className="p-3">Avg price</th>
                <th className="p-3">Sample date</th>
                <th className="p-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="p-3">{locationById(r.districtId)?.name}</td>
                  <td className="p-3 font-medium text-foreground">
                    {formatRwf(r.avgPrice)}/{productById(r.productId)?.defaultUnit}
                  </td>
                  <td className="p-3 text-muted-foreground">{r.sampleDate}</td>
                  <td className="p-3">
                    <Badge variant="secondary">
                      {r.source === "transaction" ? "From transactions" : "Manual survey"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    No records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {can("moderate") && (
        <div className="surface-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Add a manual survey price</h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="grid gap-2">
              <Label>District</Label>
              <Select value={surveyDistrictId} onValueChange={setSurveyDistrictId}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISTRICTS.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="surveyPrice">Avg price (RWF)</Label>
              <Input
                id="surveyPrice"
                type="number"
                min={0}
                className="w-40"
                value={surveyPrice}
                onChange={(e) => setSurveyPrice(e.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                const price = Number(surveyPrice);
                if (price > 0) {
                  addManualPriceRecord({ productId, districtId: surveyDistrictId, avgPrice: price });
                  setSurveyPrice("");
                }
              }}
            >
              Add record
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
