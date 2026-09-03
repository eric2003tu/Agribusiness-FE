import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Sparkles, TrendingUp, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ProductIllustration } from "@/components/product-illustration";
import { useWorkspace } from "@/lib/workspace-store";
import { formatRwf } from "@/lib/format";
import { DISTRICTS, districtOf, locationById, productById, products } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/market-prices")({
  head: () => ({
    meta: [
      { title: "Market prices — Agribridge" },
      {
        name: "description",
        content: "Compare recent prices for every product across districts and buy where it's cheapest.",
      },
    ],
  }),
  component: MarketPricesPage,
});

const produceProducts = products.filter((p) => p.type === "produce");

function MarketPricesPage() {
  const { marketPriceRecords, addManualPriceRecord, can, produceListings } = useWorkspace();
  const [productId, setProductId] = useState(produceProducts[0]?.id ?? "");
  const [surveyDistrictId, setSurveyDistrictId] = useState(DISTRICTS[0]?.id ?? "");
  const [surveyPrice, setSurveyPrice] = useState("");

  // A market-price row can exist for a product+district with no actual
  // listings there yet — link to the broader product search instead of a
  // filtered combination that would land on a dead, empty results page.
  const districtsWithListings = useMemo(() => {
    const set = new Set<string>();
    produceListings.forEach((l) => {
      const d = districtOf(l.locationId);
      if (d) set.add(`${l.productId}__${d.id}`);
    });
    return set;
  }, [produceListings]);

  const rows = useMemo(
    () =>
      marketPriceRecords
        .filter((r) => r.productId === productId)
        .sort((a, b) => a.avgPrice - b.avgPrice),
    [marketPriceRecords, productId],
  );
  const cheapest = rows[0];
  const priciest = rows[rows.length - 1];
  const average = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.avgPrice, 0) / rows.length) : 0;
  const unit = productById(productId)?.defaultUnit ?? "kg";

  const chartData = rows.map((r) => ({
    district: locationById(r.districtId)?.name ?? r.districtId,
    avgPrice: r.avgPrice,
  }));

  return (
    <AppShell
      title="Market prices"
      description="Every district's recent price, cheapest first — find where to buy, then jump straight to listings."
    >
      <div className="surface-card p-5">
        <div className="flex items-center gap-3">
          <ProductIllustration productId={productId} className="size-12" rounded="rounded-lg" />
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

        {rows.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-success/30 bg-success/10 p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium text-success">
                <Sparkles className="size-3.5" /> Cheapest
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatRwf(cheapest!.avgPrice)}/{unit}
              </p>
              <p className="text-xs text-muted-foreground">{locationById(cheapest!.districtId)?.name}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Wallet className="size-3.5" /> District average
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatRwf(average)}/{unit}
              </p>
              <p className="text-xs text-muted-foreground">across {rows.length} districts</p>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium text-warning">
                <TrendingUp className="size-3.5" /> Most expensive
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatRwf(priciest!.avgPrice)}/{unit}
              </p>
              <p className="text-xs text-muted-foreground">{locationById(priciest!.districtId)?.name}</p>
            </div>
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">No price records for this product yet.</p>
        )}

        {chartData.length > 0 && (
          <ChartContainer
            config={{ avgPrice: { label: `Avg price (RWF/${unit})`, color: "var(--chart-1)" } }}
            className="mt-6 h-80 w-full"
          >
            <BarChart data={chartData} margin={{ bottom: 48 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="district"
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(value: number) => `${value}/${unit}`}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value) => `${formatRwf(Number(value))}/${unit}`} />}
              />
              <Bar dataKey="avgPrice" fill="var(--color-avgPrice)" radius={4} />
            </BarChart>
          </ChartContainer>
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
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const isCheapest = r.id === cheapest?.id;
                const hasListings = districtsWithListings.has(`${r.productId}__${r.districtId}`);
                return (
                  <tr key={r.id} className={cn(isCheapest && "bg-success/5")}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {locationById(r.districtId)?.name}
                        {isCheapest && (
                          <Badge className="border-success/40 bg-success/15 text-success" variant="outline">
                            Cheapest
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-medium text-foreground">
                      {formatRwf(r.avgPrice)}/{productById(r.productId)?.defaultUnit}
                    </td>
                    <td className="p-3 text-muted-foreground">{r.sampleDate}</td>
                    <td className="p-3">
                      <Badge variant="secondary">
                        {r.source === "transaction" ? "From transactions" : "Manual survey"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link
                          to="/listings"
                          search={hasListings ? { product: r.productId, district: r.districtId } : { product: r.productId }}
                        >
                          {hasListings ? "View listings" : "View all listings"}
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
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
