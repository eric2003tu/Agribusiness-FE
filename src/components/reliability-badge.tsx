import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RELIABILITY_TIER_LABELS, reliabilityTier } from "@/lib/mock-data";

const TIER_CONFIG: Record<ReturnType<typeof reliabilityTier>, string> = {
  new: "border-border text-muted-foreground",
  trusted: "border-info/40 text-info",
  verified: "border-success/40 text-success",
};

export function ReliabilityBadge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const tier = reliabilityTier(score);
  return (
    <Badge
      variant="outline"
      className={`gap-1.5 ${TIER_CONFIG[tier]} ${className ?? ""}`}
      title={`Reliability score: ${score}/100`}
    >
      {tier === "verified" && <ShieldCheck className="size-3" />}
      {RELIABILITY_TIER_LABELS[tier]}
    </Badge>
  );
}
