import { cn } from "@/lib/utils";

/** Background tint + the artwork shown for each product — hand-drawn so the demo never depends on external image hosts. */
const ART: Record<string, { bg: string; art: React.ReactNode }> = {
  "prod-maize": {
    bg: "#fdf3d9",
    art: (
      <g>
        <path d="M50 12c14 0 22 12 22 34s-8 40-22 40-22-18-22-40 8-34 22-34Z" fill="#f2c14e" />
        {Array.from({ length: 6 }).map((_, row) =>
          Array.from({ length: 4 }).map((_, col) => (
            <circle
              key={`${row}-${col}`}
              cx={38 + col * 8 + (row % 2 === 0 ? 0 : 4)}
              cy={26 + row * 10}
              r={3.2}
              fill="#e0a638"
            />
          )),
        )}
        <path d="M50 12c-4-8-14-10-20-6 4 8 12 10 20 6Z" fill="#5b9a4b" />
        <path d="M50 12c4-8 14-10 20-6-4 8-12 10-20 6Z" fill="#6fb15b" />
      </g>
    ),
  },
  "prod-rice": {
    bg: "#f4f6ea",
    art: (
      <g>
        <path d="M50 78V30" stroke="#8fae5b" strokeWidth={3} strokeLinecap="round" />
        {[
          [50, 26], [42, 32], [58, 32], [36, 40], [64, 40], [42, 48], [58, 48], [36, 56], [64, 56], [50, 62],
        ].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx={6.5} ry={4} fill="#f6f1de" stroke="#d8cd9e" strokeWidth={0.6} />
        ))}
      </g>
    ),
  },
  "prod-beans": {
    bg: "#f6ece3",
    art: (
      <g>
        <ellipse cx={38} cy={44} rx={16} ry={11} fill="#a8462f" transform="rotate(-25 38 44)" />
        <ellipse cx={60} cy={38} rx={16} ry={11} fill="#c25b3f" transform="rotate(15 60 38)" />
        <ellipse cx={46} cy={62} rx={16} ry={11} fill="#8c3a26" transform="rotate(-10 46 62)" />
        <ellipse cx={68} cy={60} rx={14} ry={10} fill="#b3502f" transform="rotate(30 68 60)" />
      </g>
    ),
  },
  "prod-irish-potato": {
    bg: "#f2e9db",
    art: (
      <g>
        <ellipse cx={42} cy={46} rx={22} ry={17} fill="#c99a5b" transform="rotate(-8 42 46)" />
        <ellipse cx={66} cy={58} rx={16} ry={12} fill="#b8894a" transform="rotate(12 66 58)" />
        <circle cx={36} cy={42} r={2} fill="#8a683a" />
        <circle cx={48} cy={52} r={1.6} fill="#8a683a" />
        <circle cx={64} cy={56} r={1.8} fill="#7a5c33" />
      </g>
    ),
  },
  "prod-cassava": {
    bg: "#f1ece2",
    art: (
      <g>
        <rect x={30} y={38} width={44} height={22} rx={11} fill="#c9ac7d" transform="rotate(-18 52 49)" />
        <ellipse cx={30} cy={35} rx={9} ry={9} fill="#f4ede0" transform="rotate(-18 30 35)" />
        <ellipse cx={30} cy={35} rx={4.5} ry={4.5} fill="#e7dcc4" transform="rotate(-18 30 35)" />
        <path d="M64 30c4-8 12-10 16-6" stroke="#6fa15a" strokeWidth={4} strokeLinecap="round" fill="none" />
      </g>
    ),
  },
  "prod-tomato": {
    bg: "#fbe9e4",
    art: (
      <g>
        <circle cx={50} cy={54} r={24} fill="#e2503a" />
        <circle cx={42} cy={46} r={7} fill="#ef7a68" opacity={0.6} />
        <path d="M50 30c-4-6-14-8-18-2 6 4 12 4 18 2Z" fill="#5b9a4b" />
        <path d="M50 30c4-6 14-8 18-2-6 4-12 4-18 2Z" fill="#6fb15b" />
        <circle cx={50} cy={29} r={3} fill="#4d8a3e" />
      </g>
    ),
  },
  "prod-onion": {
    bg: "#f4ecf6",
    art: (
      <g>
        <ellipse cx={50} cy={54} rx={22} ry={26} fill="#c9a0cf" />
        <ellipse cx={50} cy={54} rx={15} ry={19} fill="#dcc0e0" />
        <ellipse cx={50} cy={54} rx={8} ry={11} fill="#efe1f1" />
        <path d="M50 28c0-8 4-14 4-18" stroke="#7a9a5a" strokeWidth={3} strokeLinecap="round" fill="none" />
      </g>
    ),
  },
  "prod-banana": {
    bg: "#fbf3d6",
    art: (
      <g>
        <path d="M28 66c6 12 34 16 46 2 4-5 2-11-4-9-10 12-30 12-38-1-3-5-8-1-4 8Z" fill="#f0cf4e" />
        <path d="M22 62c4 10 16 12 18 8-8-2-14-8-14-14-3 1-5 3-4 6Z" fill="#e2ba3a" />
        <circle cx={70} cy={56} r={2.4} fill="#7a5c1f" />
      </g>
    ),
  },
  "prod-avocado": {
    bg: "#eef4e4",
    art: (
      <g>
        <path d="M50 20c16 0 24 18 24 36 0 16-10 26-24 26s-24-10-24-26c0-18 8-36 24-36Z" fill="#4c6b3a" />
        <path d="M50 28c12 0 18 15 18 29 0 13-8 21-18 21s-18-8-18-21c0-14 6-29 18-29Z" fill="#c9d98f" />
        <circle cx={50} cy={58} r={11} fill="#6b4a2f" />
      </g>
    ),
  },
  "prod-milk": {
    bg: "#eef5f8",
    art: (
      <g>
        <path d="M42 18h16l4 12v42a6 6 0 0 1-6 6H44a6 6 0 0 1-6-6V30Z" fill="#f7fbfc" stroke="#cfe0e6" strokeWidth={2} />
        <path d="M40 44h20v10H40Z" fill="#5b9bc9" />
        <rect x={42} y={16} width={16} height={6} rx={2} fill="#8fb7cf" />
      </g>
    ),
  },
  "prod-urea": {
    bg: "#e8f0f7",
    art: (
      <g>
        <path d="M32 32h36l4 40a6 6 0 0 1-6 6H34a6 6 0 0 1-6-6Z" fill="#eef4fa" stroke="#b9cfe0" strokeWidth={2} />
        <path d="M32 32c0-8 8-14 18-14s18 6 18 14Z" fill="#4a7ab0" />
        <rect x={38} y={44} width={24} height={10} rx={2} fill="#4a7ab0" />
      </g>
    ),
  },
  "prod-dap": {
    bg: "#f2ece2",
    art: (
      <g>
        <path d="M32 32h36l4 40a6 6 0 0 1-6 6H34a6 6 0 0 1-6-6Z" fill="#f7f1e6" stroke="#d9c7a8" strokeWidth={2} />
        <path d="M32 32c0-8 8-14 18-14s18 6 18 14Z" fill="#8a6a3f" />
        <rect x={38} y={44} width={24} height={10} rx={2} fill="#8a6a3f" />
      </g>
    ),
  },
  "prod-maize-seed": {
    bg: "#fdf3d9",
    art: (
      <g>
        <rect x={26} y={22} width={48} height={58} rx={4} fill="#fbf6e3" stroke="#e0c96a" strokeWidth={2} />
        <path d="M26 22 50 42 74 22Z" fill="#e0c96a" />
        <circle cx={50} cy={60} r={12} fill="#5b9a4b" />
        <path d="M50 60c0-10 6-16 6-16" stroke="#3f6f34" strokeWidth={3} fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  "prod-bean-seed": {
    bg: "#f6ece3",
    art: (
      <g>
        <rect x={26} y={22} width={48} height={58} rx={4} fill="#f9ede6" stroke="#c98a6a" strokeWidth={2} />
        <path d="M26 22 50 42 74 22Z" fill="#c98a6a" />
        <ellipse cx={50} cy={60} rx={13} ry={9} fill="#8c3a26" transform="rotate(-15 50 60)" />
      </g>
    ),
  },
  "prod-mancozeb": {
    bg: "#eef4e4",
    art: (
      <g>
        <rect x={40} y={34} width={20} height={44} rx={4} fill="#eef4e4" stroke="#8fae5b" strokeWidth={2} />
        <rect x={44} y={22} width={12} height={14} rx={2} fill="#6fa15a" />
        <path d="M56 26h8a4 4 0 0 1 4 4v2h-12Z" fill="#5b9a4b" />
        <rect x={44} y={46} width={12} height={4} fill="#8fae5b" />
        <rect x={44} y={54} width={12} height={4} fill="#8fae5b" />
      </g>
    ),
  },
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
  const entry = productId ? ART[productId] : undefined;
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center overflow-hidden", rounded, className)}
      style={{ background: entry?.bg ?? "var(--muted)" }}
    >
      {entry ? (
        <svg viewBox="0 0 100 100" className="size-full" role="img" aria-hidden>
          {entry.art}
        </svg>
      ) : (
        <span className="text-xs text-muted-foreground">No image</span>
      )}
    </div>
  );
}
