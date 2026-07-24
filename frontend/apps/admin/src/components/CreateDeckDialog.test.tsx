import type { AdminDeck } from "@pyxie/api-client";
import { adminAPI } from "@pyxie/api-client";
import { toast } from "@pyxie/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CreateDeckDialog from "./CreateDeckDialog";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, adminAPI: { ...actual.adminAPI, createDeck: vi.fn() } };
});

vi.mock("@pyxie/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/ui")>();
  return { ...actual, toast: { ...actual.toast, success: vi.fn(), error: vi.fn() } };
});

const CREATED_DECK: AdminDeck = {
  id: "1",
  name: "My Deck",
  description: null,
  user_id: null,
  owner_username: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

async function openDialog() {
  const user = userEvent.setup();
  const onCreated = vi.fn();
  render(<CreateDeckDialog onCreated={onCreated} />);
  await user.click(screen.getByRole("button", { name: "Create deck" }));
  return { user, onCreated };
}

describe("CreateDeckDialog", () => {
  it("submits the form fields, then reports the created deck and closes", async () => {
    vi.mocked(adminAPI.createDeck).mockResolvedValue(CREATED_DECK);
    const { user, onCreated } = await openDialog();

    await user.type(screen.getByLabelText("Name"), "My Deck");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(adminAPI.createDeck).toHaveBeenCalledWith({ name: "My Deck", description: null });
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith(CREATED_DECK));
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shows an error and does not call onCreated when the API call rejects", async () => {
    vi.mocked(adminAPI.createDeck).mockRejectedValue(new Error("boom"));
    const { user, onCreated } = await openDialog();

    await user.type(screen.getByLabelText("Name"), "My Deck");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to create deck"));
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("clears the form when the dialog is cancelled and reopened", async () => {
    const { user } = await openDialog();

    await user.type(screen.getByLabelText("Name"), "My Deck");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "Create deck" }));
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });
});
