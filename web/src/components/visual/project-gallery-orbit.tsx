"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export interface ProjectGalleryOrbitItem {
  id: string;
  slug: string;
  title: string;
  imageUrl?: string;
}

export interface ProjectGalleryOrbitProps {
  items: ProjectGalleryOrbitItem[];
  ariaLabel: string;
}

const AUTO_SCROLL_PX_PER_SECOND = 8;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return mobile;
}

export function ProjectGalleryOrbit({ items, ariaLabel }: ProjectGalleryOrbitProps) {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const [dragging, setDragging] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ x: number; scrollLeft: number } | null>(null);
  const autoScrollOffsetRef = useRef(0);

  const orbitItems = useMemo(() => items.slice(0, 8), [items]);
  const orbitTrackItems = useMemo(() => {
    if (orbitItems.length <= 1) return orbitItems;
    const minimumTrackItems = 8;
    const repeated = [...orbitItems];
    while (repeated.length < minimumTrackItems) {
      repeated.push(...orbitItems);
    }
    return repeated.slice(0, Math.max(minimumTrackItems, orbitItems.length));
  }, [orbitItems]);
  const loopItems = useMemo(() => [...orbitTrackItems, ...orbitTrackItems], [orbitTrackItems]);
  const singleItem = orbitItems.length === 1;

  useEffect(() => {
    if (reducedMotion || isMobile || dragging || orbitTrackItems.length < 2) return;
    const container = scrollContainerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    let rafId = 0;
    let previous = performance.now();
    const loopWidth = track.scrollWidth / 2;
    if (loopWidth <= 0) return;

    const tick = (now: number) => {
      const deltaMs = now - previous;
      previous = now;
      const deltaPx = (AUTO_SCROLL_PX_PER_SECOND * deltaMs) / 1000;
      autoScrollOffsetRef.current += deltaPx;
      if (autoScrollOffsetRef.current >= loopWidth) {
        autoScrollOffsetRef.current -= loopWidth;
      }
      container.scrollLeft = Math.round(autoScrollOffsetRef.current);
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [dragging, isMobile, orbitTrackItems.length, reducedMotion]);

  useEffect(() => {
    if (isMobile || reducedMotion) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    autoScrollOffsetRef.current = 0;
    container.scrollLeft = 0;
  }, [isMobile, reducedMotion, orbitTrackItems.length]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || isMobile) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    dragStateRef.current = { x: event.clientX, scrollLeft: container.scrollLeft };
    autoScrollOffsetRef.current = container.scrollLeft;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || reducedMotion || isMobile) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const delta = event.clientX - dragStateRef.current.x;
    const nextScrollLeft = dragStateRef.current.scrollLeft - delta;
    container.scrollLeft = nextScrollLeft;
    autoScrollOffsetRef.current = nextScrollLeft;
  };

  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (orbitItems.length === 0) return null;

  if (isMobile || reducedMotion) {
    return (
      <div
        aria-label={ariaLabel}
        data-testid="project-gallery-orbit"
        className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)]/70"
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[var(--color-bg-canvas)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--color-bg-canvas)] to-transparent" />
        <div
          className={[
            "flex overflow-x-auto px-4 py-4 snap-x snap-mandatory hide-scrollbar",
            singleItem ? "justify-center" : "gap-3",
          ].join(" ")}
        >
          {orbitItems.slice(0, 6).map((item) => (
            <Link
              key={item.id}
              href={`/projects/${item.slug}`}
              className="snap-start shrink-0 w-40 h-[11rem] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/95 p-2 flex flex-col"
            >
              <div className="relative h-28 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)]">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt="" fill sizes="160px" className="object-cover opacity-90" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-elevated-hover)]">
                    <span className="font-mono text-sm text-[var(--color-text-primary)]">{item.title.charAt(0)}</span>
                  </div>
                )}
              </div>
              <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs font-medium leading-relaxed text-[var(--color-text-secondary)]">
                {item.title}
              </p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      aria-label={ariaLabel}
      data-testid="project-gallery-orbit"
      className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-bg-surface)]/75 px-4 py-4"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[var(--color-bg-canvas)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[var(--color-bg-canvas)] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[var(--color-bg-canvas)]/40 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--color-bg-canvas)]/70 to-transparent" />

      <div
        ref={scrollContainerRef}
        data-testid="project-gallery-orbit-scroller"
        className={[
          "hide-scrollbar relative overflow-x-auto overflow-y-hidden touch-pan-x",
          singleItem ? "cursor-default" : dragging ? "cursor-grabbing" : "cursor-grab",
        ].join(" ")}
        onPointerDown={singleItem ? undefined : onPointerDown}
        onPointerMove={singleItem ? undefined : onPointerMove}
        onPointerUp={singleItem ? undefined : onPointerEnd}
        onPointerCancel={singleItem ? undefined : onPointerEnd}
      >
        <div
          ref={trackRef}
          className={[
            "py-1 pr-4",
            singleItem ? "flex justify-center" : "flex w-max gap-4",
          ].join(" ")}
        >
          {(singleItem ? orbitItems : loopItems).map((item, index) => (
            <Link
              key={`${item.id}-${index}`}
              href={`/projects/${item.slug}`}
              className="block w-52 h-[14.75rem] shrink-0 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/96 p-2 shadow-[var(--shadow-modal)] backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5"
            >
              <div className="relative h-36 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)]">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt="" fill sizes="208px" className="object-cover opacity-90" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-elevated-hover)]">
                    <span className="font-mono text-base text-[var(--color-text-primary)]">{item.title.charAt(0)}</span>
                  </div>
                )}
              </div>
              <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs font-medium leading-relaxed text-[var(--color-text-secondary)]">
                {item.title}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
