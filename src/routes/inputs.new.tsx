import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace-store";
import { DISTRICTS, products, type Unit } from "@/lib/mock-data";

export const Route = createFileRoute("/inputs/new")({
  head: () => ({ meta: [{ title: "New input listing — Agribridge" }] }),
  component: NewInputPage,
});

const inputProducts = products.filter((p) => p.type === "input");

function NewInputPage() {
  const { addInputListing } = useWorkspace();
  const navigate = useNavigate();
  const [productId, setProductId] = useState(inputProducts[0]?.id ?? "");
  const [unit, setUnit] = useState<Unit>("kg");
  const [price, setPrice] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [districtIds, setDistrictIds] = useState<string[]>([]);

  function toggleDistrict(id: string) {
    setDistrictIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  function submit() {
    const priceNum = Number(price);
    const stockNum = Number(stockQty);
    if (!productId || !priceNum || priceNum <= 0 || !stockNum || stockNum <= 0) return;
    addInputListing({
      productId,
      unit,
      price: priceNum,
      stockQty: stockNum,
      deliveryDistrictIds: districtIds,
    });
    void navigate({ to: "/inputs" });
  }

  return (
    <AppShell title="List an agricultural input" description="Fertilizer, seed or pesticide for farmers to order.">
      <form
        className="surface-card mx-auto max-w-2xl space-y-5 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-2">
          <Label>Input</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {inputProducts.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="price">Price per unit (RWF)</Label>
            <Input id="price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Unit</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as Unit)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="litre">litre</SelectItem>
                <SelectItem value="piece">piece</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="stock">Stock quantity</Label>
            <Input id="stock" type="number" min={0} value={stockQty} onChange={(e) => setStockQty(e.target.value)} required />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Delivery districts</Label>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3">
            {DISTRICTS.map((d) => (
              <label key={d.id} className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={districtIds.includes(d.id)}
                  onCheckedChange={() => toggleDistrict(d.id)}
                />
                {d.name}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/inputs" })}>
            Cancel
          </Button>
          <Button type="submit">Publish listing</Button>
        </div>
      </form>
    </AppShell>
  );
}
