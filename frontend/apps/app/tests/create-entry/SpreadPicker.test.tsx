// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { Spread } from "@pyxie/api-client";
import { spreadsAPI } from "@pyxie/api-client";
import { LoadingProvider } from "@pyxie/providers";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SpreadPicker from "../../src/create-entry/SpreadPicker";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, spreadsAPI: { ...actual.spreadsAPI, listSpreads: vi.fn() } };
});

const SPREADS: Spread[] = [
  {
    id: "spread-1",
    name: "Single Card",
    description: null,
    num_cards: 1,
    positions: [{ index: 0, label: "Center", x: 0.5, y: 0.5, rotation: 0, scale: 1 }],
    prompts: ["What do you notice?"],
    allow_reversed: true,
    user_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("SpreadPicker", () => {
  it("renders spread names once loaded", async () => {
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue(SPREADS);
    render(
      <MemoryRouter>
        <LoadingProvider>
          <SpreadPicker onDrawn={vi.fn()} />
        </LoadingProvider>
      </MemoryRouter>,
    );

    // The label also renders (hidden) inside the closed dropdown's listbox, so scope the query
    // to the trigger to avoid an ambiguous match.
    const trigger = screen.getByRole("combobox");
    expect(await within(trigger).findByText("Single Card (1 card)")).toBeInTheDocument();
  });

  it("calls onDrawn with a draw of the right length when confirmed", async () => {
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue(SPREADS);
    const onDrawn = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoadingProvider>
          <SpreadPicker onDrawn={onDrawn} />
        </LoadingProvider>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: "Draw" }));

    expect(onDrawn).toHaveBeenCalledTimes(1);
    const [spread, cards] = onDrawn.mock.calls[0];
    expect(spread.id).toBe("spread-1");
    expect(cards).toHaveLength(1);
  });

  it("navigates to /spreads when the create-your-own link is clicked", async () => {
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue(SPREADS);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoadingProvider>
          <SpreadPicker onDrawn={vi.fn()} />
        </LoadingProvider>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: "Create your own spread with the Spreaditor™!" }));

    expect(navigateMock).toHaveBeenCalledWith("/settings/spreads/create");
  });

  it("opens the full view dialog, showing the selected spread's details, when Preview is clicked", async () => {
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue(SPREADS);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoadingProvider>
          <SpreadPicker onDrawn={vi.fn()} />
        </LoadingProvider>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: "Preview" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("What do you notice?")).toBeInTheDocument();
  });

  // TODO: Shouldn't test solo spread here - ensure it's tested for the correct component
});
