import { ImageOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Tracks whether an <img> failed to load, including the SSR race where the
 * browser finishes (and fails) the request before React hydrates and attaches
 * the error handler — the native error event fires before onError exists, so
 * a mount-time `complete && naturalWidth === 0` check is required too.
 */
export function useImageFallback() {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  return { failed, imgRef, onError: () => setFailed(true) };
}

export function ImageFallback({ className }: { className?: string | undefined }) {
  return (
    <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}>
      <ImageOff className="size-6 opacity-40" />
    </div>
  );
}

/**
 * An <img> that falls back to a soft placeholder instead of a broken-image
 * icon when the file isn't there yet — lets a page ship before every real
 * photo has been dropped into public/images.
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
  const { failed, imgRef, onError } = useImageFallback();

  if (failed) {
    return <ImageFallback className={className} />;
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      loading="lazy"
      className={cn("object-cover", className)}
      onError={onError}
    />
  );
}
