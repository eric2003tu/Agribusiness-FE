import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoUploader } from "@/components/photo-uploader";
import { ProductIllustration } from "@/components/product-illustration";
import { useWorkspace } from "@/lib/workspace-store";
import { locations, products, type ListingScope, type Unit } from "@/lib/mock-data";

export const Route = createFileRoute("/listings/new")({
  head: () => ({ meta: [{ title: "New listing — Agribridge" }] }),
  component: NewListingPage,
});

const produceProducts = products.filter((p) => p.type === "produce");
const villageAndUpLocations = locations.filter((l) => l.level !== "region");

function NewListingPage() {
  const { addListing } = useWorkspace();
  const navigate = useNavigate();
  const [productId, setProductId] = useState(produceProducts[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<Unit>("kg");
  const [negotiable, setNegotiable] = useState(false);
  const [unitPrice, setUnitPrice] = useState("");
  const [locationId, setLocationId] = useState(villageAndUpLocations[0]?.id ?? "");
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().slice(0, 10));
  const [qualityGrade, setQualityGrade] = useState("");
  const [listingScope, setListingScope] = useState<ListingScope>("commercial");
  const [photos, setPhotos] = useState<string[]>([]);

  function submit() {
    const qty = Number(quantity);
    if (!productId || !qty || qty <= 0 || !locationId) return;
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    addListing({
      productId,
      quantity: qty,
      unit,
      unitPrice: negotiable ? null : Number(unitPrice) || null,
      negotiable,
      locationId,
      harvestDate,
      ...(qualityGrade ? { qualityGrade } : {}),
      listingScope,
      expiresAt: expires.toISOString().slice(0, 10),
      ...(photos.length > 0 ? { photos } : {}),
    });
    void navigate({ to: "/listings" });
  }

  return (
    <AppShell title="New produce listing" description="List your harvest for buyers and other farmers to find.">
      <form
        className="surface-card mx-auto max-w-2xl space-y-5 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex items-end gap-3">
          <ProductIllustration productId={productId} className="size-14" />
          <div className="grid flex-1 gap-2">
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
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

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Negotiable price</p>
            <p className="text-xs text-muted-foreground">Let buyers propose their own price.</p>
          </div>
          <Switch checked={negotiable} onCheckedChange={setNegotiable} />
        </div>

        {!negotiable && (
          <div className="grid gap-2">
            <Label htmlFor="price">Unit price (RWF)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
          </div>
        )}

        <div className="grid gap-2">
          <Label>Location</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {villageAndUpLocations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="harvest">Harvest date</Label>
            <Input
              id="harvest"
              type="date"
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="grade">Quality grade (optional)</Label>
            <Input
              id="grade"
              placeholder="Grade A"
              value={qualityGrade}
              onChange={(e) => setQualityGrade(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Photos (optional)</Label>
          <p className="text-xs text-muted-foreground">
            Buyers see a generic product picture until you add your own.
          </p>
          <PhotoUploader photos={photos} onChange={setPhotos} />
        </div>

        <div className="grid gap-2">
          <Label>Listing scope</Label>
          <Select value={listingScope} onValueChange={(v) => setListingScope(v as ListingScope)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="commercial">Commercial — open to any buyer</SelectItem>
              <SelectItem value="peer">Peer-to-peer — nearby farmers only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/listings" })}>
            Cancel
          </Button>
          <Button type="submit">Publish listing</Button>
        </div>
      </form>
    </AppShell>
  );
}
