import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Photo } from "@/components/photo";

interface Slide {
  src: string;
  alt: string;
}

const SLIDES: Slide[] = [
  { src: "/images/hero.jpg", alt: "Fresh harvest laid out and ready to list for sale" },
  { src: "/images/how-it-works.jpg", alt: "A farmer tending crops in the field" },
  { src: "/images/role-buyer.jpg", alt: "A busy produce market where buyers source directly from farmers" },
  { src: "/images/role-transporter.jpg", alt: "Shared transport picking up a bulk produce order" },
];

const SLIDE_DURATION_MS = 4500;

export function HeroSlideshow() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % SLIDES.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl shadow-lg">
      {SLIDES.map((slide, index) => (
        <div
          key={slide.src}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-in-out",
            index === active ? "opacity-100" : "opacity-0",
          )}
          aria-hidden={index !== active}
        >
          <Photo src={slide.src} alt={slide.alt} className="size-full" />
        </div>
      ))}

      <div className="absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-1.5">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`Show slide ${index + 1}`}
            aria-current={index === active}
            className={cn(
              "h-1.5 rounded-full transition-all",
              index === active ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75",
            )}
          />
        ))}
      </div>
    </div>
  );
}
