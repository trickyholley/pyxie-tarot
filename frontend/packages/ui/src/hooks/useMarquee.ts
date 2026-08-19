// SPDX-License-Identifier: AGPL-3.0-or-later
import * as React from "react";

/**
 * Measures how far `contentRef`'s natural width exceeds `containerRef`'s visible width, to drive a
 * marquee slide animation. Works on touch too, since it doesn't depend on hover/focus.
 */
export function useMarquee<Container extends HTMLElement, Content extends HTMLElement>() {
  const containerRef = React.useRef<Container>(null);
  const contentRef = React.useRef<Content>(null);
  const [distance, setDistance] = React.useState(0);

  React.useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const measure = () => setDistance(Math.max(0, content.scrollWidth - container.clientWidth));
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return { containerRef, contentRef, isOverflowing: distance > 0, distance };
}

/** Turns useMarquee's output into the inline style its `animate-marquee` keyframe reads its slide distance from. */
export function marqueeStyle(isOverflowing: boolean, distance: number): React.CSSProperties | undefined {
  return isOverflowing ? ({ "--marquee-distance": `${distance}px` } as React.CSSProperties) : undefined;
}
