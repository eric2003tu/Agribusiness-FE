import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoUploader } from "@/components/photo-uploader";
import { ProductIllustration } from "@/components/product-illustration";
import { useWorkspace } from "@/lib/workspace-store";
import { formatRwf } from "@/lib/format";
import { DISTRICTS, productById, products, type Unit } from "@/lib/mock-data";

export const Route = createFileRoute("/inputs/new")({
  head: () => ({ meta: [{ title: "New input listing — Agribridge" }] }),
  component: NewInputPage,
});

const inputProducts = products.filter((p) => p.type === "input");

function NewInputPage() {
  const { addInputListing, currentUser } = useWorkspace();
  const navigate = useNavigate();
  const [productId, setProductId] = useState(inputProducts[0]?.id ?? "");
  const [unit, setUnit] = useState<Unit>("kg");
  const [price, setPrice] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [districtIds, setDistrictIds] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");

  const product = productById(productId);

  function toggleDistrict(id: string) {
    setDistrictIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  function submit() {
    const priceNum = Number(price);
    const stockNum = Number(stockQty);
    if (!productId || !priceNum || priceNum <= 0 || !stockNum || stockNum <= 0) {
      setError("Fill in a valid price and stock quantity.");
      return;
    }
    if (districtIds.length === 0) {
      setError("Select at least one delivery district so buyers know where you can supply.");
      return;
    }
    if (photos.length === 0) {
      setError("Add at least one product photo — buyers trust listings with real photos.");
      return;
    }
    setError("");
    addInputListing({
      productId,
      unit,
      price: priceNum,
      stockQty: stockNum,
      deliveryDistrictIds: districtIds,
      photos,
    });
    void navigate({ to: "/inputs" });
  }

  return (
    <AppShell title="List an agricultural input" description="Fertilizer, seed or pesticide for farmers to order.">
      <div className="grid gap-6 lg:grid-cols-3">
        <form
          className="surface-card space-y-5 p-6 lg:col-span-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex items-end gap-3">
            <ProductIllustration productId={productId} className="size-14" />
            <div className="grid flex-1 gap-2">
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
            <p className="text-xs text-muted-foreground">
              Select every district you can supply — this is how buyers find you.
            </p>
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

          <div className="grid gap-2">
            <Label>Product photos</Label>
            <p className="text-xs text-muted-foreground">
              Add at least one real photo of the product — listings with photos sell faster.
            </p>
            <PhotoUploader photos={photos} onChange={setPhotos} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/inputs" })}>
              Cancel
            </Button>
            <Button type="submit">Publish listing</Button>
          </div>
        </form>

        <div className="space-y-6">
          <section className="surface-card sticky top-20 overflow-hidden">
            {photos[0] ? (
              <img src={photos[0]} alt="Listing preview" className="h-40 w-full object-cover" />
            ) : (
              <ProductIllustration productId={productId} className="h-40 w-full" rounded="rounded-none" />
            )}
            <div className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{product?.name ?? "Product"}</p>
              <p className="text-sm text-muted-foreground">Supplied by {currentUser.name}</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Price</dt>
                  <dd className="font-medium text-foreground">
                    {price ? `${formatRwf(Number(price))}/${unit}` : "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">In stock</dt>
                  <dd className="font-medium text-foreground">{stockQty ? `${stockQty} ${unit}` : "—"}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Delivers to</dt>
                  <dd className="text-right font-medium text-foreground">
                    {districtIds.length > 0
                      ? DISTRICTS.filter((d) => districtIds.includes(d.id))
                          .map((d) => d.name)
                          .join(", ")
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
