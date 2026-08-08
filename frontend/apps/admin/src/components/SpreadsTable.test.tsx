// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { AdminSpread } from "@pyxie/api-client";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SpreadsTable from "./SpreadsTable";

const SPREADS: AdminSpread[] = [
  {
    id: "1",
    name: "Three Card",
    description: "Past, present, future",
    num_cards: 3,
    positions: [],
    prompts: [],
    allow_reversed: true,
    user_id: null,
    owner_username: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Custom spread",
    description: null,
    num_cards: 1,
    positions: [],
    prompts: [],
    allow_reversed: false,
    user_id: "user-1",
    owner_username: "pyxie",
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-02-15T00:00:00Z",
  },
];

describe("SpreadsTable", () => {
  it("renders one row per spread, falling back to System for spreads with no owner", () => {
    render(<SpreadsTable spreads={SPREADS} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("Three Card")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
    expect(screen.getByText("Custom spread")).toBeInTheDocument();
    expect(screen.getByText("pyxie")).toBeInTheDocument();
  });

  it("calls onEdit with the row's spread when the edit button is clicked", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<SpreadsTable spreads={SPREADS} onEdit={onEdit} onDelete={vi.fn()} />);

    const rows = screen.getAllByRole("row");
    const [editButton] = within(rows[1]).getAllByRole("button").slice(-2);
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(SPREADS[0]);
  });

  it("calls onDelete with the row's spread when the delete button is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<SpreadsTable spreads={SPREADS} onEdit={vi.fn()} onDelete={onDelete} />);

    const rows = screen.getAllByRole("row");
    const [, deleteButton] = within(rows[1]).getAllByRole("button").slice(-2);
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(SPREADS[0]);
  });
});
