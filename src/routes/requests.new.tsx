import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace-store";
import { locations, products, type Unit } from "@/lib/mock-data";

export const Route = createFileRoute("/requests/new")({
  head: () => ({ meta: [{ title: "New request — Agribridge" }] }),
  component: NewRequestPage,
});

const produceProducts = products.filter((p) => p.type === "produce");
const deliveryLocations = locations.filter((l) => l.level !== "region");

function NewRequestPage() {
  const { addRequest } = useWorkspace();
  const navigate = useNavigate();
  const [productId, setProductId] = useState(produceProducts[0]?.id ?? "");
  const [quantityNeeded, setQuantityNeeded] = useState("");
  const [unit, setUnit] = useState<Unit>("kg");
  const [targetPrice, setTargetPrice] = useState("");
  const [deliveryLocationId, setDeliveryLocationId] = useState(deliveryLocations[0]?.id ?? "");
  const [neededByDate, setNeededByDate] = useState("");

  function submit() {
    const qty = Number(quantityNeeded);
    if (!productId || !qty || qty <= 0 || !deliveryLocationId || !neededByDate) return;
    addRequest({
      productId,
      quantityNeeded: qty,
      unit,
      targetPrice: Number(targetPrice) || null,
      deliveryLocationId,
      neededByDate,
    });
    void navigate({ to: "/requests" });
  }

  return (
    <AppShell title="New buyer request" description="Tell farmers and cooperatives what you need.">
      <form
        className="surface-card mx-auto max-w-2xl space-y-5 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-2">
          <Label>Product</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger>
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

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="quantity">Quantity needed</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={quantityNeeded}
              onChange={(e) => setQuantityNeeded(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Unit</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as Unit)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="ton">ton</SelectItem>
                <SelectItem value="bag">bag (50kg)</SelectItem>
                <SelectItem value="litre">litre</SelectItem>
                <SelectItem value="piece">piece</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="targetPrice">Target price (RWF, optional)</Label>
          <Input
            id="targetPrice"
            type="number"
            min={0}
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label>Delivery location</Label>
          <Select value={deliveryLocationId} onValueChange={setDeliveryLocationId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {deliveryLocations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="neededBy">Needed by</Label>
          <Input
            id="neededBy"
            type="date"
            value={neededByDate}
            onChange={(e) => setNeededByDate(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/requests" })}>
            Cancel
          </Button>
          <Button type="submit">Post request</Button>
        </div>
      </form>
    </AppShell>
  );
}
