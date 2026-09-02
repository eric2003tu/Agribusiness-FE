import { ImageOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * An <img> that falls back to a soft placeholder instead of a broken-image
 * icon when the file isn't there yet — lets the landing page ship before
 * every real photo has been dropped into public/images.
 */
export function Photo({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className,
        )}
      >
        <ImageOff className="size-6 opacity-40" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
