"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ICarousel } from "@/types";

const AUTOPLAY_DELAY = 6000;
const MOBILE_BREAKPOINT = "(max-width: 640px)";

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: {
    saveData?: boolean;
  };
};

export function HomeCarousel({ items }: { items: ICarousel[] }) {
  const [current, setCurrent] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isLowEndDevice, setIsLowEndDevice] = React.useState(false);
  const [isMobileViewport, setIsMobileViewport] = React.useState(false);
  const touchStartX = React.useRef<number | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const total = items.length;
  const item = items[current];
  const lowMotionMode = Boolean(prefersReducedMotion || isLowEndDevice);
  const imageQuality = isMobileViewport || isLowEndDevice ? 65 : 78;

  const goToSlide = React.useCallback(
    (index: number) => {
      setCurrent((index + total) % total);
    },
    [total],
  );

  const nextSlide = React.useCallback(() => {
    goToSlide(current + 1);
  }, [current, goToSlide]);

  const prevSlide = React.useCallback(() => {
    goToSlide(current - 1);
  }, [current, goToSlide]);

  const handleTouchStart = React.useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      touchStartX.current = event.touches[0]?.clientX ?? null;
    },
    [],
  );

  const handleTouchEnd = React.useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (touchStartX.current === null) return;

      const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
      const swipeDelta = touchStartX.current - endX;
      const threshold = 45;

      if (Math.abs(swipeDelta) >= threshold) {
        if (swipeDelta > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }

      touchStartX.current = null;
    },
    [nextSlide, prevSlide],
  );

  React.useEffect(() => {
    if (total <= 1 || isPaused) return;

    const timer = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % total);
    }, AUTOPLAY_DELAY);

    return () => window.clearInterval(timer);
  }, [total, isPaused]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const nav = window.navigator as NavigatorWithHints;
    const lowCpu = (nav.hardwareConcurrency ?? 8) <= 4;
    const lowMemory = (nav.deviceMemory ?? 8) <= 4;
    const dataSaverEnabled = nav.connection?.saveData === true;

    setIsLowEndDevice(lowCpu || lowMemory || dataSaverEnabled);

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT);
    const syncMobileViewport = () => setIsMobileViewport(mediaQuery.matches);

    syncMobileViewport();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncMobileViewport);
      return () => mediaQuery.removeEventListener("change", syncMobileViewport);
    }

    mediaQuery.addListener(syncMobileViewport);
    return () => mediaQuery.removeListener(syncMobileViewport);
  }, []);

  if (!items.length) return null;

  return (
    <section
      aria-label="Featured banners"
      tabIndex={0}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          prevSlide();
        }
        if (event.key === "ArrowRight") {
          nextSlide();
        }
      }}
      className="group relative w-full overflow-hidden bg-black shadow-sm"
    >
      <div className="relative aspect-16/10 min-h-65 overflow-hidden bg-black sm:aspect-16/8 sm:min-h-90 md:aspect-16/6 lg:aspect-16/5 xl:aspect-[16/4.6]">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={current}
            initial={
              lowMotionMode
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 1.05 }
            }
            animate={{ opacity: 1, scale: 1 }}
            exit={
              lowMotionMode
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 1.01 }
            }
            transition={
              lowMotionMode
                ? { duration: 0.12, ease: "linear" }
                : { duration: 0.65, ease: [0.22, 1, 0.36, 1] }
            }
            className="absolute inset-0 bg-black"
          >
            <Link
              href={item.url}
              aria-label={`Open featured banner: ${item.title}`}
              className="absolute inset-0 z-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <span className="sr-only">{`Open featured banner: ${item.title}`}</span>
            </Link>

            <Image
              src={item.image}
              alt={item.title}
              fill
              priority={current === 0}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 95vw, 1280px"
              quality={imageQuality}
              className="object-cover"
            />

            <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/45 to-black/5" />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-black/10 sm:from-black/35" />

            <div className="pointer-events-none absolute inset-x-4 bottom-6 z-10 sm:inset-x-auto sm:bottom-auto sm:left-8 sm:top-1/2 sm:w-[58%] sm:-translate-y-1/2 md:left-14 md:w-[48%] lg:left-24 lg:w-[40%] xl:left-32">
              <motion.div
                initial={
                  lowMotionMode ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }
                }
                animate={{ opacity: 1, y: 0 }}
                transition={
                  lowMotionMode
                    ? { duration: 0.1 }
                    : { duration: 0.38, delay: 0.1 }
                }
                className="max-w-xl"
              >
                <p className="mb-3 hidden text-xs font-semibold uppercase tracking-[0.25em] text-white/70 sm:block">
                  Featured Collection
                </p>

                <h2 className="text-balance text-3xl font-black leading-[0.95] tracking-tight text-white drop-shadow-lg sm:text-4xl md:text-5xl lg:text-6xl">
                  {item.title}
                </h2>

                <div className="mt-4 flex flex-wrap items-center gap-3 sm:mt-7">
                  <Button
                    asChild
                    size="lg"
                    className="pointer-events-auto h-10 rounded-full px-5 text-sm font-bold shadow-xl shadow-black/20 sm:h-12 sm:px-8 sm:text-base"
                  >
                    <Link href={item.url}>{item.buttonCaption}</Link>
                  </Button>

                  <span className="hidden text-sm font-medium text-white/70 sm:inline">
                    Swipe, tap banner, or use arrows
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {total > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous banner"
              onClick={prevSlide}
              className={cn(
                "absolute left-3 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 text-white transition hover:scale-105 hover:bg-white/20 active:scale-95 md:flex md:opacity-0 md:group-hover:opacity-100",
                isLowEndDevice ? "bg-black/55" : "bg-black/25 backdrop-blur-xl",
              )}
            >
              <ChevronLeft size={22} />
            </button>

            <button
              type="button"
              aria-label="Next banner"
              onClick={nextSlide}
              className={cn(
                "absolute right-3 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 text-white transition hover:scale-105 hover:bg-white/20 active:scale-95 md:flex md:opacity-0 md:group-hover:opacity-100",
                isLowEndDevice ? "bg-black/55" : "bg-black/25 backdrop-blur-xl",
              )}
            >
              <ChevronRight size={22} />
            </button>

            <div
              className={cn(
                "absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 px-3 py-2 sm:bottom-5",
                isLowEndDevice ? "bg-black/55" : "bg-black/20 backdrop-blur-xl",
              )}
            >
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to banner ${i + 1}`}
                  onClick={() => goToSlide(i)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    current === i
                      ? "w-8 bg-white"
                      : "w-2 bg-white/45 hover:bg-white/80",
                  )}
                />
              ))}
            </div>

            {!isPaused && !lowMotionMode && (
              <motion.div
                key={`progress-${current}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: AUTOPLAY_DELAY / 1000,
                  ease: "linear",
                }}
                className="absolute bottom-0 left-0 z-20 h-1 w-full origin-left bg-primary"
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
