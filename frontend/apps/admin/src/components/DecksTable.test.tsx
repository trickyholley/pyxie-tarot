// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { AdminDeck } from "@pyxie/api-client";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DecksTable from "./DecksTable";

const DECKS: AdminDeck[] = [
  {
    id: "1",
    name: "Rider-Waite-Smith",
    description: "The classic deck",
    user_id: null,
    owner_username: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Custom deck",
    description: null,
    user_id: "user-1",
    owner_username: "pyxie",
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-02-15T00:00:00Z",
  },
];

describe("DecksTable", () => {
  it("renders one row per deck, falling back to System for decks with no owner", () => {
    render(<DecksTable decks={DECKS} onViewCards={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("Rider-Waite-Smith")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
    expect(screen.getByText("Custom deck")).toBeInTheDocument();
    expect(screen.getByText("pyxie")).toBeInTheDocument();
  });

  it("calls onViewCards with the row's deck when the view-cards button is clicked", async () => {
    const user = userEvent.setup();
    const onViewCards = vi.fn();
    render(<DecksTable decks={DECKS} onViewCards={onViewCards} onEdit={vi.fn()} onDelete={vi.fn()} />);

    const rows = screen.getAllByRole("row");
    const [viewButton] = within(rows[1]).getAllByRole("button").slice(-3);
    await user.click(viewButton);

    expect(onViewCards).toHaveBeenCalledWith(DECKS[0]);
  });

  it("calls onEdit and onDelete with the row's deck when their buttons are clicked", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<DecksTable decks={DECKS} onViewCards={vi.fn()} onEdit={onEdit} onDelete={onDelete} />);

    const rows = screen.getAllByRole("row");
    const [, editButton, deleteButton] = within(rows[1]).getAllByRole("button").slice(-3);

    await user.click(editButton);
    expect(onEdit).toHaveBeenCalledWith(DECKS[0]);

    await user.click(deleteButton);
    expect(onDelete).toHaveBeenCalledWith(DECKS[0]);
  });
});
