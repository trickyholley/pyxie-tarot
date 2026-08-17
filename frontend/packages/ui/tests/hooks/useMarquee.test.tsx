// SPDX-License-Identifier: AGPL-3.0-or-later
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMarquee } from "../../src/hooks/useMarquee";

function TestMarquee() {
  const { containerRef, contentRef, isOverflowing, distance } = useMarquee<HTMLDivElement, HTMLSpanElement>();
  return (
    <div ref={containerRef} data-testid="container">
      <span ref={contentRef} data-testid="content">
        some long overflowing label
      </span>
      <output data-testid="result">{isOverflowing ? `overflow:${distance}` : "fits"}</output>
    </div>
  );
}

function triggerLastResizeObserver() {
  const callback = vi.mocked(ResizeObserver).mock.calls.at(-1)?.[0];
  act(() => callback?.([], {} as ResizeObserver));
}

describe("useMarquee", () => {
  it("reports no overflow when content fits", () => {
    render(<TestMarquee />);

    expect(screen.getByTestId("result")).toHaveTextContent("fits");
  });

  it("reports the overflow distance once content exceeds the container", () => {
    render(<TestMarquee />);

    Object.defineProperty(screen.getByTestId("container"), "clientWidth", { value: 100, configurable: true });
    Object.defineProperty(screen.getByTestId("content"), "scrollWidth", { value: 180, configurable: true });
    triggerLastResizeObserver();

    expect(screen.getByTestId("result")).toHaveTextContent("overflow:80");
  });
});
