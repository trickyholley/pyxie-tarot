// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { HeaderConfig, HeaderContext, useHeader } from "../../src/lib/header.tsx";

function Page({ title, backTo }: HeaderConfig) {
  useHeader({ title, backTo });
  return null;
}

function Harness({ mount }: { mount: boolean }) {
  const [header, setHeader] = useState<HeaderConfig | null>(null);
  return (
    <HeaderContext.Provider value={setHeader}>
      {mount && <Page title="Diary" />}
      <p data-testid="title">{header?.title ?? "none"}</p>
    </HeaderContext.Provider>
  );
}

describe("useHeader", () => {
  it("publishes the page's config to the header context and clears it on unmount", () => {
    const { rerender, getByTestId } = render(<Harness mount />);

    expect(getByTestId("title")).toHaveTextContent("Diary");

    rerender(<Harness mount={false} />);

    expect(getByTestId("title")).toHaveTextContent("none");
  });

  it("no-ops without a provider", () => {
    expect(() => render(<Page title="Diary" />)).not.toThrow();
  });
});
