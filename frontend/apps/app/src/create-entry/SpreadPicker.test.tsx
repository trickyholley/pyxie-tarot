// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Spread } from "@pyxie/api-client";
import { spreadsAPI } from "@pyxie/api-client";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SpreadPicker from "./SpreadPicker";

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
    positions: [{ index: 0, label: "Center", x: 0.5, y: 0.5, rotation: 0 }],
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
    render(<SpreadPicker onDrawn={vi.fn()} />);

    // The label also renders (hidden) inside the closed dropdown's listbox, so scope the query
    // to the trigger to avoid an ambiguous match.
    const trigger = screen.getByRole("combobox");
    expect(await within(trigger).findByText("Single Card (1 card)")).toBeInTheDocument();
  });

  it("calls onDrawn with a draw of the right length when confirmed", async () => {
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue(SPREADS);
    const onDrawn = vi.fn();
    const user = userEvent.setup();
    render(<SpreadPicker onDrawn={onDrawn} />);

    await user.click(await screen.findByRole("button", { name: "Draw" }));

    expect(onDrawn).toHaveBeenCalledTimes(1);
    const [spread, cards] = onDrawn.mock.calls[0];
    expect(spread.id).toBe("spread-1");
    expect(cards).toHaveLength(1);
  });
});
