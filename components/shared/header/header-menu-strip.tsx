"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function HeaderMenuStrip({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hidden, setHidden] = useState(false);

  const lastY = useRef(0);
  const rafId = useRef<number | null>(null);
  const hiddenRef = useRef(false);
  const lockUntil = useRef(0);

  useEffect(() => {
    const TOP_SAFE_ZONE = 12;
    const MIN_DELTA = 2;
    const TOGGLE_LOCK_MS = 120;

    const setMenuHidden = (next: boolean) => {
      if (hiddenRef.current === next) return;
      hiddenRef.current = next;
      setHidden(next);
    };

    lastY.current = Math.max(window.scrollY, 0);

    const onScroll = () => {
      if (rafId.current) return;

      rafId.current = window.requestAnimationFrame(() => {
        rafId.current = null;

        const currentY = Math.max(window.scrollY, 0);
        const previousY = lastY.current;
        const delta = currentY - previousY;

        if (currentY <= TOP_SAFE_ZONE) {
          setMenuHidden(false);
          lastY.current = currentY;
          return;
        }

        if (Math.abs(delta) < MIN_DELTA) {
          lastY.current = currentY;
          return;
        }

        const now = performance.now();
        if (now < lockUntil.current) {
          lastY.current = currentY;
          return;
        }

        if (delta > 0 && !hiddenRef.current) {
          // Scrolling down: hide immediately, then briefly lock to avoid flicker.
          setMenuHidden(true);
          lockUntil.current = now + TOGGLE_LOCK_MS;
        } else if (delta < 0 && hiddenRef.current) {
          // Scrolling up: show immediately, then briefly lock to avoid flicker.
          setMenuHidden(false);
          lockUntil.current = now + TOGGLE_LOCK_MS;
        }

        lastY.current = currentY;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);

      if (rafId.current) {
        window.cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        "relative z-40 overflow-hidden transition-none",
        hidden
          ? "pointer-events-none max-h-0 opacity-0"
          : "max-h-24 opacity-100",
      )}
    >
      <div
        className={cn(
          "transform-gpu transition-none will-change-transform",
          hidden ? "-translate-y-full" : "translate-y-0",
        )}
      >
        {children}
      </div>
    </div>
  );
}
