import type { User } from "@pyxie/api-client";
import { userAPI } from "@pyxie/api-client";
import { toast } from "@pyxie/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CreateUserDialog from "./CreateUserDialog";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, userAPI: { ...actual.userAPI, createUser: vi.fn() } };
});

vi.mock("@pyxie/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/ui")>();
  return { ...actual, toast: { ...actual.toast, success: vi.fn(), error: vi.fn() } };
});

const CREATED_USER: User = {
  id: "1",
  username: "pyxie",
  email: "pyxie@example.com",
  role: "user",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

async function openDialog() {
  const user = userEvent.setup();
  const onCreated = vi.fn();
  render(<CreateUserDialog onCreated={onCreated} />);
  await user.click(screen.getByRole("button", { name: "Create user" }));
  return { user, onCreated };
}

describe("CreateUserDialog", () => {
  it("submits the form fields plus the seed password, then reports the created user and closes", async () => {
    vi.mocked(userAPI.createUser).mockResolvedValue({ json: () => Promise.resolve(CREATED_USER) } as Response);
    const { user, onCreated } = await openDialog();

    await user.type(screen.getByLabelText("Username"), "pyxie");
    await user.type(screen.getByLabelText("Email"), "pyxie@example.com");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(userAPI.createUser).toHaveBeenCalledWith({
      username: "pyxie",
      email: "pyxie@example.com",
      password: "pyxie-tarot",
    });
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith(CREATED_USER));
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shows an error and does not call onCreated when the API call rejects", async () => {
    vi.mocked(userAPI.createUser).mockRejectedValue(new Error("boom"));
    const { user, onCreated } = await openDialog();

    await user.type(screen.getByLabelText("Username"), "pyxie");
    await user.type(screen.getByLabelText("Email"), "pyxie@example.com");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to create user"));
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("clears the form when the dialog is cancelled and reopened", async () => {
    const { user } = await openDialog();

    await user.type(screen.getByLabelText("Username"), "pyxie");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "Create user" }));
    expect(screen.getByLabelText("Username")).toHaveValue("");
  });
});
