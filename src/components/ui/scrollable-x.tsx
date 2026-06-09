"use client";

import * as React from "react";

/**
 * Horizontal scroll container with a synchronized scrollbar on BOTH the top
 * and the bottom of the content.
 *
 * The bottom bar is the browser's native one; the top bar is a thin proxy
 * whose scroll position is mirrored to/from the content, so a user can scroll
 * a wide table horizontally without first scrolling down to reach the native
 * scrollbar. Both bars only appear when the content actually overflows — when
 * it fits, the proxy collapses to a 1px strip and shows nothing.
 */
export function ScrollableX({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const topRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = React.useState(0);
  // Guards against the scroll-sync feedback loop (setting B's scrollLeft fires
  // B's onScroll, which would set A's, …).
  const syncing = React.useRef(false);

  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setContentWidth(el.scrollWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sync = (from: "top" | "bottom") => {
    if (syncing.current) {
      syncing.current = false;
      return;
    }
    const src = from === "top" ? topRef.current : bottomRef.current;
    const dst = from === "top" ? bottomRef.current : topRef.current;
    if (!src || !dst || src.scrollLeft === dst.scrollLeft) return;
    syncing.current = true;
    dst.scrollLeft = src.scrollLeft;
  };

  return (
    <div className={className}>
      {/* Top proxy scrollbar — mirrors the content width. */}
      <div
        ref={topRef}
        onScroll={() => sync("top")}
        className="w-full overflow-x-auto overflow-y-hidden"
        aria-hidden
      >
        <div style={{ width: contentWidth, height: 1 }} />
      </div>
      {/* Real content with the native (bottom) scrollbar. */}
      <div ref={bottomRef} onScroll={() => sync("bottom")} className="w-full overflow-x-auto">
        <div ref={contentRef}>{children}</div>
      </div>
    </div>
  );
}
