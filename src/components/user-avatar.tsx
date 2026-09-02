import type { User } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const TONES = [
  "bg-primary text-primary-foreground",
  "bg-info text-info-foreground",
  "bg-success text-success-foreground",
  "bg-warning text-warning-foreground",
  "bg-secondary text-secondary-foreground",
];

export function UserAvatar({
  user,
  className,
}: {
  user?: User | null | undefined;
  className?: string | undefined;
}) {
  const initials = user
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
    : "—";

  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        user ? TONES[user.avatarColorIndex % TONES.length] : "bg-muted text-muted-foreground",
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
