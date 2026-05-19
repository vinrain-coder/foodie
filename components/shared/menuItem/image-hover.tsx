"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type ImageHoverProps = {
  src: string;
  hoverSrc: string;
  alt: string;
  className?: string;
};

export default function ImageHover({
  src,
  hoverSrc,
  alt,
  className,
}: ImageHoverProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [shouldRenderHover, setShouldRenderHover] = useState(false);

  return (
    <div
      className={cn("relative h-52", className)}
      onMouseEnter={() => {
        setShouldRenderHover(true);
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className={`object-cover transition-opacity duration-300 ${
          isHovered ? "opacity-0" : "opacity-100"
        }`}
        loading="lazy"
      />

      {shouldRenderHover && (
        <Image
          src={hoverSrc}
          alt={alt}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={`absolute inset-0 object-cover transition-opacity duration-300 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
        />
      )}
    </div>
  );
}
