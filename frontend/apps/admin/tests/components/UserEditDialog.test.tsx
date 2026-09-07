// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { adminAPI } from "@pyxie/api-client";
import { makeTestUser } from "@pyxie/providers/src/testUtils.ts";
import { toast } from "@pyxie/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import UserEditDialog from "../../src/components/UserEditDialog";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, adminAPI: { ...actual.adminAPI, updateUser: vi.fn() } };
});

vi.mock("@pyxie/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/ui")>();
  return { ...actual, toast: { ...actual.toast, success: vi.fn(), error: vi.fn() } };
});

const EXISTING_USER = makeTestUser({
  username: "pyxie",
  email: "pyxie@example.com",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  settings: {
    theme: { name: "Pyxie (Default)" },
    reminder: { enabled: false, time: null },
    notifications: { enabled: false },
  },
});

const UPDATED_USER = { ...EXISTING_USER, username: "pyxie2" };

describe("UserEditDialog", () => {
  it("does not render as open when user is null", () => {
    render(<UserEditDialog user={null} onOpenChange={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("pre-fills the form from the given user when opened", () => {
    render(<UserEditDialog user={EXISTING_USER} onOpenChange={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByLabelText("Username")).toHaveValue("pyxie");
    expect(screen.getByLabelText("Email")).toHaveValue("pyxie@example.com");
  });

  it("submits the edited fields and reports the saved user", async () => {
    vi.mocked(adminAPI.updateUser).mockResolvedValue(UPDATED_USER);
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<UserEditDialog user={EXISTING_USER} onOpenChange={vi.fn()} onSaved={onSaved} />);

    await user.clear(screen.getByLabelText("Username"));
    await user.type(screen.getByLabelText("Username"), "pyxie2");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(adminAPI.updateUser).toHaveBeenCalledWith("1", { username: "pyxie2", email: "pyxie@example.com" });
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith(UPDATED_USER));
  });

  it("discards unsaved edits when reopened on the same user after cancel", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<UserEditDialog user={EXISTING_USER} onOpenChange={vi.fn()} onSaved={vi.fn()} />);

    await user.clear(screen.getByLabelText("Username"));
    await user.type(screen.getByLabelText("Username"), "discarded-draft");

    // Cancel: parent nulls out `user` without changing the EXISTING_USER object itself.
    rerender(<UserEditDialog user={null} onOpenChange={vi.fn()} onSaved={vi.fn()} />);
    // Reopen the same user (same object reference) rather than a different one.
    rerender(<UserEditDialog user={EXISTING_USER} onOpenChange={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByLabelText("Username")).toHaveValue("pyxie");
  });

  it("shows an error and does not call onSaved when the API call rejects", async () => {
    vi.mocked(adminAPI.updateUser).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<UserEditDialog user={EXISTING_USER} onOpenChange={vi.fn()} onSaved={onSaved} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to update user"));
    expect(onSaved).not.toHaveBeenCalled();
  });
});
