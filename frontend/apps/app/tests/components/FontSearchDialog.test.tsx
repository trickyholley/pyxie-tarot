// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { FontSearchResult } from "@pyxie/api-client";
import { fontsAPI } from "@pyxie/api-client";
import { LoadingProvider } from "@pyxie/providers";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import FontSearchDialog from "../../src/components/FontSearchDialog.tsx";

// Debounce timing isn't this file's concern (useDebounce.test.ts in @pyxie/admin's app covers the
// hook itself) - collapsing it to an identity keeps these tests from needing fake timers.
vi.mock("@/lib/useDebounce.ts", () => ({ useDebounce: <T,>(value: T) => value }));

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, fontsAPI: { ...actual.fontsAPI, searchFonts: vi.fn() } };
});

const SPACE_MONO: FontSearchResult = {
  id: "space-mono",
  family: "Space Mono",
  category: "monospace",
  variable: false,
  preview_url: "https://cdn.example/space-mono.woff2",
};

async function openDialog() {
  const user = userEvent.setup();
  render(
    <LoadingProvider>
      <FontSearchDialog onSelect={vi.fn()} />
    </LoadingProvider>,
  );
  await user.click(screen.getByRole("button", { name: "Search fonts" }));
  return user;
}

describe("FontSearchDialog", () => {
  it("stages a clicked result and only applies it once Apply is clicked", async () => {
    const onSelect = vi.fn();
    vi.mocked(fontsAPI.searchFonts).mockResolvedValue([SPACE_MONO]);
    const user = userEvent.setup();
    render(
      <LoadingProvider>
        <FontSearchDialog onSelect={onSelect} />
      </LoadingProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Search fonts" }));

    await user.type(await screen.findByPlaceholderText("Search by name…"), "sp");
    await user.click((await screen.findByText("Space Mono")).closest("button") as HTMLButtonElement);
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onSelect).toHaveBeenCalledWith("space-mono");
  });

  it("shows a searching placeholder while a query is in flight", async () => {
    let resolveSearch!: (results: FontSearchResult[]) => void;
    vi.mocked(fontsAPI.searchFonts).mockReturnValue(new Promise((resolve) => (resolveSearch = resolve)));
    const user = await openDialog();

    await user.type(await screen.findByPlaceholderText("Search by name…"), "sp");
    expect(await screen.findByText("Searching…")).toBeInTheDocument();

    await act(async () => resolveSearch([SPACE_MONO]));
    expect(screen.queryByText("Searching…")).not.toBeInTheDocument();
  });

  it("shows a no-results placeholder when a query comes back empty", async () => {
    vi.mocked(fontsAPI.searchFonts).mockResolvedValue([]);
    const user = await openDialog();

    await user.type(await screen.findByPlaceholderText("Search by name…"), "zzzzznonexistentfont");
    expect(await screen.findByText("No fonts found.")).toBeInTheDocument();
  });
});
