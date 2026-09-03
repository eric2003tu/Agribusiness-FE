import { createFileRoute, Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Boxes,
  Handshake,
  LineChart,
  MapPinned,
  Package,
  ShieldCheck,
  ShoppingBasket,
  ShoppingCart,
  Sparkles,
  Sprout,
  Store,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { HeroSlideshow } from "@/components/hero-slideshow";
import { LandingNavbar } from "@/components/landing-navbar";
import { Photo } from "@/components/photo";
import { ProductIllustration } from "@/components/product-illustration";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace-store";
import { formatRwf } from "@/lib/format";
import { DISTRICTS, locationLabel, productById } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agribridge — Digital agricultural marketplace for Rwanda" },
      {
        name: "description",
        content:
          "Agribridge connects farmers, buyers and input suppliers across Rwanda — bulk aggregation, group input purchasing and transparent district-by-district pricing.",
      },
      { property: "og:title", content: "Agribridge — Digital agricultural marketplace" },
      {
        property: "og:description",
        content: "Sell your harvest, buy in bulk, and never guess the price again.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/images/og-image.jpg" },
    ],
  }),
  component: LandingPage,
});

interface Step {
  number: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    title: "List or request",
    body: "Farmers list their harvest with price, quantity and exact location. Buyers post what they need, how much, and where it should be delivered.",
  },
  {
    number: "02",
    title: "Get matched automatically",
    body: "When a buyer's order is bigger than any single farmer can supply, Agribridge combines nearby listings into one bulk sale — every farmer confirms their share before it's final.",
  },
  {
    number: "03",
    title: "Confirm and get paid",
    body: "Both sides confirm delivery before a deal is marked complete. Every finished transaction builds your reliability score for next time.",
  },
];

interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    icon: Sprout,
    title: "Direct produce listings",
    body: "List your harvest with photos, quality grade and a fixed or negotiable price — searchable by product and district.",
  },
  {
    icon: Handshake,
    title: "Bulk aggregation",
    body: "Can't fill a large order alone? Get combined with nearby farmers into one confirmed group sale, automatically.",
  },
  {
    icon: Boxes,
    title: "Group input buying",
    body: "Pool fertilizer, seed and pesticide orders with farmers nearby to unlock bulk discounts from verified suppliers.",
  },
  {
    icon: LineChart,
    title: "Transparent market prices",
    body: "Compare real recent prices by district, cheapest first, before you sell or buy — then jump straight to the listing.",
  },
  {
    icon: ShieldCheck,
    title: "Two-sided confirmation",
    body: "Every transaction is confirmed by both the buyer and the seller before it's marked complete — no disputes left hanging.",
  },
  {
    icon: Sparkles,
    title: "Reliability scores",
    body: "A trust score built from real transaction history, with verification and cooperative endorsements for new farmers.",
  },
];

interface RoleCard {
  icon: LucideIcon;
  image: string;
  title: string;
  body: string;
}

const ROLES: RoleCard[] = [
  {
    icon: Sprout,
    image: "/images/role-farmer.jpg",
    title: "Farmers",
    body: "List your harvest, join bulk aggregation sales, and pool input orders with your cooperative to unlock better prices.",
  },
  {
    icon: ShoppingBasket,
    image: "/images/role-buyer.jpg",
    title: "Buyers",
    body: "Post what you need and get matched with enough farmers to fill the order — no more chasing individual sellers.",
  },
  {
    icon: Package,
    image: "/images/role-supplier.jpg",
    title: "Input suppliers",
    body: "Reach farmers directly with fertilizer, seed and pesticide, and fulfil group orders at scale instead of one at a time.",
  },
  {
    icon: Truck,
    image: "/images/role-transporter.jpg",
    title: "Transporters",
    body: "Pick up shared loads from confirmed aggregation groups instead of arranging transport for one small delivery at a time.",
  },
];

interface CategoryCard {
  productId: string;
  name: string;
}

const CATEGORY_SHORTCUTS: CategoryCard[] = [
  { productId: "prod-maize", name: "Cereals" },
  { productId: "prod-beans", name: "Legumes" },
  { productId: "prod-irish-potato", name: "Tubers" },
  { productId: "prod-tomato", name: "Vegetables" },
  { productId: "prod-banana", name: "Fruits" },
  { productId: "prod-milk", name: "Dairy" },
];

function LandingPage() {
  const { produceListings, users, transactions } = useWorkspace();

  const availableListings = produceListings.filter((l) => l.status === "available");
  const featured = availableListings.slice(0, 8);
  const totalTraded = transactions
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.quantity * t.unitPrice, 0);

  const stats = [
    { icon: Store, label: "Active listings", value: `${availableListings.length}+` },
    { icon: MapPinned, label: "Districts covered", value: `${DISTRICTS.length}` },
    { icon: Users, label: "Farmers & buyers", value: `${users.length}+` },
    { icon: Wallet, label: "Traded on Agribridge", value: formatRwf(totalTraded) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">
          <div>
            <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              Digital marketplace for Rwandan agriculture
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              Fresh produce and farm inputs, traded directly.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Browse real listings by product and district, add them to your cart, and pay in a
              few taps — or list your own harvest and reach buyers across Rwanda today.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link to="/register">
                  <ShoppingCart className="size-4" /> Start shopping
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/register">
                  Sell your harvest <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Phone number sign-in · No middlemen · Built for Rwanda's farming cooperatives
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <HeroSlideshow />
            <div className="surface-card pointer-events-none absolute -bottom-6 -left-6 z-20 hidden items-center gap-3 p-4 sm:flex">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
                <ShieldCheck className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Two-sided confirmed</p>
                <p className="text-xs text-muted-foreground">Every deal, logged and trusted</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live stats strip */}
        <div className="border-t border-border bg-muted/30">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 sm:px-6 lg:grid-cols-4 lg:px-8">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <stat.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-foreground">{stat.value}</p>
                  <p className="truncate text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by category */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Shop by category</h2>
          <Link to="/register" className="text-sm font-medium text-primary hover:underline">
            View all products
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {CATEGORY_SHORTCUTS.map((cat) => (
            <Link
              key={cat.name}
              to="/register"
              className="surface-card flex flex-col items-center gap-2 p-4 text-center transition-shadow hover:shadow-md"
            >
              <ProductIllustration productId={cat.productId} className="size-14" rounded="rounded-full" />
              <span className="text-xs font-medium text-foreground">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured listings */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
                <TrendingUp className="size-5 text-primary" /> Popular right now
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Real listings on the marketplace today — sign up to add them to your cart.
              </p>
            </div>
            <Link to="/register" className="text-sm font-medium text-primary hover:underline">
              Browse the full marketplace
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((listing) => {
              const product = productById(listing.productId);
              return (
                <div key={listing.id} className="surface-card overflow-hidden">
                  {listing.photos?.[0] ? (
                    <img
                      src={listing.photos[0]}
                      alt={product?.name ?? "Listing"}
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <ProductIllustration productId={listing.productId} className="h-36 w-full" rounded="rounded-none" />
                  )}
                  <div className="p-4">
                    <p className="text-sm font-semibold text-foreground">{product?.name ?? "Product"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{locationLabel(listing.locationId)}</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {listing.unitPrice ? (
                        <>
                          {formatRwf(listing.unitPrice)}
                          <span className="text-xs font-normal text-muted-foreground">/{listing.unit}</span>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">Negotiable</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">How it works</h2>
          <p className="mt-3 text-muted-foreground">
            From first listing to completed sale, in three steps.
          </p>
        </div>
        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="space-y-8">
            {STEPS.map((step) => (
              <div key={step.number} className="flex gap-4">
                <span className="text-3xl font-bold text-primary/25">{step.number}</span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
          <Photo
            src="/images/how-it-works.jpg"
            alt="Farmers and a buyer agreeing on a bulk produce order"
            className="aspect-[4/3] w-full rounded-2xl shadow-lg"
          />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Everything a produce marketplace needs
            </h2>
            <p className="mt-3 text-muted-foreground">
              Built around the way farmers, buyers and suppliers actually trade.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="surface-card p-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <feature.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Built for everyone in the chain</h2>
          <p className="mt-3 text-muted-foreground">
            One account can hold more than one role — a farmer can buy inputs too.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((role) => (
            <div key={role.title} className="surface-card overflow-hidden text-center">
              <Photo src={role.image} alt={`${role.title} using Agribridge`} className="aspect-[4/3] w-full" />
              <div className="p-6">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <role.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{role.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{role.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-primary-foreground">
            Ready to trade smarter?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
            It's free to list, browse and buy — sign up with just your phone number.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/register">
                Create your account <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                AB
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Agribridge</p>
                <p className="text-xs text-muted-foreground">Farmers · Buyers · Suppliers</p>
              </div>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground">Features</a>
              <a href="#how-it-works" className="hover:text-foreground">How it works</a>
              <a href="#roles" className="hover:text-foreground">Who it's for</a>
              <Link to="/login" className="hover:text-foreground">Sign in</Link>
              <Link to="/register" className="hover:text-foreground">Get started</Link>
            </nav>
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>© 2026 Agribridge. Demo marketplace · mock data.</p>
            <p>Built for Rwanda's farmers, buyers and input suppliers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
