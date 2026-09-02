import { Photo } from "@/components/photo";
import { cn } from "@/lib/utils";

/**
 * Real product photos are limited in this demo, so several products share the
 * closest-matching shot on purpose — fine for development, swap in per-product
 * photography later.
 */
const PRODUCT_IMAGE: Record<string, string> = {
  "prod-maize": "/images/hero.jpg",
  "prod-rice": "/images/role-farmer.jpg",
  "prod-beans": "/images/role-supplier.jpg",
  "prod-irish-potato": "/images/role-supplier.jpg",
  "prod-cassava": "/images/role-supplier.jpg",
  "prod-tomato": "/images/role-buyer.jpg",
  "prod-onion": "/images/how-it-works.jpg",
  "prod-banana": "/images/hero.jpg",
  "prod-avocado": "/images/hero.jpg",
  "prod-milk": "/images/role-transporter.jpg",
  "prod-urea": "/images/role-transporter.jpg",
  "prod-dap": "/images/role-transporter.jpg",
  "prod-maize-seed": "/images/role-farmer.jpg",
  "prod-bean-seed": "/images/role-supplier.jpg",
  "prod-mancozeb": "/images/how-it-works.jpg",
};

export function ProductIllustration({
  productId,
  className,
  rounded = "rounded-xl",
}: {
  productId: string | undefined | null;
  className?: string;
  rounded?: string;
}) {
  const src = productId ? PRODUCT_IMAGE[productId] : undefined;
  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden bg-muted", rounded, className)}>
      {src ? (
        <Photo src={src} alt="" className="size-full" />
      ) : (
        <span className="text-xs text-muted-foreground">No image</span>
      )}
    </div>
  );
}
