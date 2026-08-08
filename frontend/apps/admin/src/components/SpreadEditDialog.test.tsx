// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { AdminSpread, Spread } from "@pyxie/api-client";
import { adminAPI } from "@pyxie/api-client";
import { toast } from "@pyxie/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SpreadEditDialog from "./SpreadEditDialog";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, adminAPI: { ...actual.adminAPI, updateSpread: vi.fn() } };
});

vi.mock("@pyxie/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/ui")>();
  return { ...actual, toast: { ...actual.toast, success: vi.fn(), error: vi.fn() } };
});

const EXISTING_SPREAD: AdminSpread = {
  id: "1",
  name: "Three Card",
  description: "A classic",
  num_cards: 1,
  positions: [{ index: 0, label: "Past", x: 0.5, y: 0.5, rotation: 0, scale: 1 }],
  prompts: [],
  allow_reversed: true,
  user_id: null,
  owner_username: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const UPDATED_SPREAD: Spread = { ...EXISTING_SPREAD, name: "Three Card v2" };

describe("SpreadEditDialog", () => {
  it("does not render as open when spread is null", () => {
    render(<SpreadEditDialog spread={null} onOpenChange={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("pre-fills the form from the given spread", () => {
    render(<SpreadEditDialog spread={EXISTING_SPREAD} onOpenChange={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByLabelText("Name")).toHaveValue("Three Card");
    expect(screen.getByLabelText("Description")).toHaveValue("A classic");
    expect(screen.getByDisplayValue("Past")).toBeInTheDocument();
  });

  it("submits the edited fields and reports the saved spread", async () => {
    vi.mocked(adminAPI.updateSpread).mockResolvedValue(UPDATED_SPREAD);
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<SpreadEditDialog spread={EXISTING_SPREAD} onOpenChange={vi.fn()} onSaved={onSaved} />);

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Three Card v2");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(adminAPI.updateSpread).toHaveBeenCalledWith("1", {
      name: "Three Card v2",
      description: "A classic",
      positions: EXISTING_SPREAD.positions,
      prompts: [],
      allow_reversed: true,
    });
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith(UPDATED_SPREAD));
  });

  it("shows an error toast and does not call onSaved when the API call rejects", async () => {
    vi.mocked(adminAPI.updateSpread).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<SpreadEditDialog spread={EXISTING_SPREAD} onOpenChange={vi.fn()} onSaved={onSaved} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to update spread"));
    expect(onSaved).not.toHaveBeenCalled();
  });
});
