import { Loader2 } from "lucide-react";

/** Shown by the router while any route is pending (e.g. a lazy-loaded route
 * chunk) — kept generic since it can render before we know the target
 * page's own layout. */
export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
          AB
        </span>
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}
