// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { AdminSpread } from "@pyxie/api-client";
import { adminAPI } from "@pyxie/api-client";
import { toast } from "@pyxie/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CreateSpreadDialog from "./CreateSpreadDialog";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, adminAPI: { ...actual.adminAPI, createSpread: vi.fn() } };
});

vi.mock("@pyxie/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/ui")>();
  return { ...actual, toast: { ...actual.toast, success: vi.fn(), error: vi.fn() } };
});

const CREATED_SPREAD: AdminSpread = {
  id: "1",
  name: "Three Card",
  description: null,
  num_cards: 1,
  positions: [{ index: 0, label: "Past", x: 0.5, y: 0.5, rotation: 0, scale: 1 }],
  prompts: [],
  allow_reversed: true,
  user_id: null,
  owner_username: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("CreateSpreadDialog", () => {
  it("creates a spread from the default single position plus a filled-in label", async () => {
    vi.mocked(adminAPI.createSpread).mockResolvedValue(CREATED_SPREAD);
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(<CreateSpreadDialog onCreated={onCreated} />);

    await user.click(screen.getByRole("button", { name: "Create spread" }));
    await user.type(screen.getByLabelText("Name"), "Three Card");
    await user.type(screen.getByPlaceholderText("Label"), "Past");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(adminAPI.createSpread).toHaveBeenCalledWith({
      name: "Three Card",
      description: null,
      positions: [{ index: 0, label: "Past", x: 0.5, y: 0.5, rotation: 0, scale: 1 }],
      prompts: [],
      allow_reversed: true,
    });
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith("Spread created"));
    expect(onCreated).toHaveBeenCalledWith(CREATED_SPREAD);
  });

  it("shows an error toast and does not call onCreated when the API call rejects", async () => {
    vi.mocked(adminAPI.createSpread).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(<CreateSpreadDialog onCreated={onCreated} />);

    await user.click(screen.getByRole("button", { name: "Create spread" }));
    await user.type(screen.getByLabelText("Name"), "Three Card");
    await user.type(screen.getByPlaceholderText("Label"), "Past");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to create spread"));
    expect(onCreated).not.toHaveBeenCalled();
  });
});
