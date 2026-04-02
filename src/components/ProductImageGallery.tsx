import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type TouchEvent,
} from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  isPromoActive: boolean;
  discountPercent: number;
}

type ZoomState = {
  index: number | null;
  originX: number;
  originY: number;
};

const DOUBLE_TAP_DELAY = 280;

const createDefaultZoomState = (): ZoomState => ({
  index: null,
  originX: 50,
  originY: 50,
});

const clampPercentage = (value: number) => Math.min(85, Math.max(15, value));

const ProductImageGallery = ({ images, productName, isPromoActive, discountPercent }: ProductImageGalleryProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const lastTapRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomState, setZoomState] = useState<ZoomState>(createDefaultZoomState);

  const clearZoom = useCallback(() => {
    setZoomState(createDefaultZoomState());
  }, []);

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const slide = slideRefs.current[index];
    const nextLeft = slide ? slide.offsetLeft : index * track.clientWidth;

    track.scrollTo({ left: nextLeft, behavior });
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
    clearZoom();
    trackRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [clearZoom, images]);

  useEffect(() => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const updateActiveIndex = () => {
      if (zoomState.index !== null || !track.clientWidth) {
        return;
      }

      const nextIndex = Math.round(track.scrollLeft / track.clientWidth);
      const safeIndex = Math.max(0, Math.min(images.length - 1, nextIndex));

      setActiveIndex((current) => (current === safeIndex ? current : safeIndex));
    };

    const handleResize = () => {
      scrollToIndex(activeIndex, "auto");
    };

    track.addEventListener("scroll", updateActiveIndex, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      track.removeEventListener("scroll", updateActiveIndex);
      window.removeEventListener("resize", handleResize);
    };
  }, [activeIndex, images.length, scrollToIndex, zoomState.index]);

  const getZoomOrigin = useCallback((element: HTMLElement, clientX: number, clientY: number) => {
    const rect = element.getBoundingClientRect();

    return {
      originX: clampPercentage(((clientX - rect.left) / rect.width) * 100),
      originY: clampPercentage(((clientY - rect.top) / rect.height) * 100),
    };
  }, []);

  const toggleZoom = useCallback((index: number, originX = 50, originY = 50) => {
    setZoomState((current) =>
      current.index === index
        ? createDefaultZoomState()
        : {
            index,
            originX: clampPercentage(originX),
            originY: clampPercentage(originY),
          },
    );
  }, []);

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }, []);

  const handleTouchEnd = useCallback(
    (index: number, event: TouchEvent<HTMLDivElement>) => {
      const touch = event.changedTouches[0];
      const touchStart = touchStartRef.current;

      touchStartRef.current = null;

      if (touchStart) {
        const movedX = Math.abs(touch.clientX - touchStart.x);
        const movedY = Math.abs(touch.clientY - touchStart.y);

        if (movedX > 10 || movedY > 10) {
          lastTapRef.current = 0;
          return;
        }
      }

      const now = Date.now();

      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        const { originX, originY } = getZoomOrigin(event.currentTarget, touch.clientX, touch.clientY);

        toggleZoom(index, originX, originY);
        lastTapRef.current = 0;
        return;
      }

      lastTapRef.current = now;
    },
    [getZoomOrigin, toggleZoom],
  );

  const handleDoubleClick = useCallback(
    (index: number, event: MouseEvent<HTMLDivElement>) => {
      const { originX, originY } = getZoomOrigin(event.currentTarget, event.clientX, event.clientY);

      toggleZoom(index, originX, originY);
    },
    [getZoomOrigin, toggleZoom],
  );

  const handleKeyDown = useCallback(
    (index: number, event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      toggleZoom(index);
    },
    [toggleZoom],
  );

  const goToPrevious = useCallback(() => {
    clearZoom();
    scrollToIndex((activeIndex - 1 + images.length) % images.length);
  }, [activeIndex, clearZoom, images.length, scrollToIndex]);

  const goToNext = useCallback(() => {
    clearZoom();
    scrollToIndex((activeIndex + 1) % images.length);
  }, [activeIndex, clearZoom, images.length, scrollToIndex]);

  const isZoomed = zoomState.index === activeIndex;

  return (
    <div className="space-y-3">
      <div className="w-full max-w-full overflow-hidden">
        <div className="relative w-full touch-pan-y">
          <div
            ref={trackRef}
            className={cn(
              "flex max-w-full snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-2xl touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              isZoomed && "overflow-x-hidden",
            )}
            aria-label={`Galeria de imagens de ${productName}`}
          >
            {images.map((image, index) => {
              const slideIsZoomed = zoomState.index === index;

              return (
                <div
                  key={`${image}-${index}`}
                  ref={(node) => {
                    slideRefs.current[index] = node;
                  }}
                  className="min-w-full snap-center"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Imagem ${index + 1} de ${images.length}`}
                >
                  <div className="aspect-[4/3] w-full max-w-full overflow-hidden rounded-2xl bg-muted sm:aspect-square">
                    <div
                      role="button"
                      tabIndex={0}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={(event) => handleTouchEnd(index, event)}
                      onDoubleClick={(event) => handleDoubleClick(index, event)}
                      onKeyDown={(event) => handleKeyDown(index, event)}
                      aria-label={`${slideIsZoomed ? "Reduzir" : "Ampliar"} imagem ${index + 1} de ${images.length} de ${productName}`}
                      aria-pressed={slideIsZoomed}
                      className={cn(
                        "flex h-full w-full items-center justify-center overflow-hidden outline-none",
                        slideIsZoomed ? "cursor-zoom-out touch-none" : "cursor-zoom-in touch-pan-x touch-manipulation",
                      )}
                    >
                      <img
                        src={image}
                        alt={`${productName} — imagem ${index + 1}`}
                        loading={index === 0 ? "eager" : "lazy"}
                        draggable={false}
                        className={cn(
                          "pointer-events-none h-full w-full max-w-full select-none object-contain p-2 transition-transform duration-300 sm:p-4",
                          slideIsZoomed && "scale-[1.9]",
                        )}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          transformOrigin: `${slideIsZoomed ? zoomState.originX : 50}% ${slideIsZoomed ? zoomState.originY : 50}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={goToPrevious}
                aria-label="Imagem anterior"
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-background/90 p-2 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-background"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                aria-label="Próxima imagem"
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-background/90 p-2 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-background"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-3 right-3 z-10 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
                {activeIndex + 1}/{images.length}
              </div>
            </>
          )}

          <div className="absolute right-3 top-3 z-10 sm:hidden">
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-full bg-background/90 px-3 text-xs shadow-sm backdrop-blur-sm" onClick={() => toggleZoom(activeIndex)}>
              {isZoomed ? <ZoomOut className="mr-1 h-3.5 w-3.5" /> : <ZoomIn className="mr-1 h-3.5 w-3.5" />}
              {isZoomed ? "Reduzir" : "Zoom"}
            </Button>
          </div>

          {isPromoActive && discountPercent > 0 && (
            <Badge className="absolute left-3 top-3 z-10 animate-pulse bg-destructive px-3 py-1 text-sm text-destructive-foreground sm:left-3 sm:top-3">
              {discountPercent}% OFF
            </Badge>
          )}
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 sm:hidden">
          {images.map((_, index) => (
            <button
              key={`indicator-${index}`}
              type="button"
              onClick={() => {
                clearZoom();
                scrollToIndex(index);
              }}
              aria-label={`Ir para a imagem ${index + 1}`}
              className={cn(
                "h-2 rounded-full transition-all",
                index === activeIndex ? "w-5 bg-primary" : "w-2 bg-border",
              )}
            />
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:hidden">
        {isZoomed
          ? "Imagem ampliada. Toque duas vezes ou use o botão Zoom para voltar ao tamanho normal."
          : images.length > 1
            ? "Deslize horizontalmente para trocar de imagem e toque duas vezes para ampliar."
            : "Toque duas vezes na imagem para ampliar."}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((image, index) => (
            <button
              key={`thumb-${index}`}
              type="button"
              onClick={() => {
                clearZoom();
                scrollToIndex(index);
              }}
              aria-label={`Ver imagem ${index + 1}`}
              className={cn(
                "h-14 w-14 shrink-0 snap-start overflow-hidden rounded-lg border-2 transition-all md:h-16 md:w-16",
                index === activeIndex ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-primary/50",
              )}
            >
              <img
                src={image}
                alt={`Miniatura ${index + 1} de ${productName}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;