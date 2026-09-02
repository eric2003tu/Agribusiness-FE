import { createFileRoute, Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Boxes,
  Handshake,
  LineChart,
  Package,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Sprout,
  Truck,
} from "lucide-react";
import { HeroSlideshow } from "@/components/hero-slideshow";
import { LandingNavbar } from "@/components/landing-navbar";
import { Photo } from "@/components/photo";
import { Button } from "@/components/ui/button";

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

function LandingPage() {
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
              Sell your harvest. Buy in bulk. Never guess the price again.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Agribridge connects farmers, buyers and input suppliers directly — with bulk
              aggregation, group input purchasing and transparent district-by-district pricing.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link to="/register">
                  Get started free <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">Sign in</Link>
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
