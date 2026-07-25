import type { User } from "@pyxie/api-client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DeleteUserDialog from "./DeleteUserDialog";
import RoleChangeDialog from "./RoleChangeDialog";

const SOME_USER: User = {
  id: "1",
  username: "pyxie",
  email: "pyxie@example.com",
  role: "user",
  is_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("DeleteUserDialog", () => {
  it("does not render as open when user is null", () => {
    render(<DeleteUserDialog user={null} deleting={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("names the user being deleted", () => {
    render(<DeleteUserDialog user={SOME_USER} deleting={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText(/permanently delete pyxie/)).toBeInTheDocument();
  });

  it("calls onConfirm when Delete is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DeleteUserDialog user={SOME_USER} deleting={false} onOpenChange={vi.fn()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it("calls onOpenChange(false) when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<DeleteUserDialog user={SOME_USER} deleting={false} onOpenChange={onOpenChange} onConfirm={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalled();
    expect(onOpenChange.mock.calls[0][0]).toBe(false);
  });

  it("disables the Delete button while deleting", () => {
    render(<DeleteUserDialog user={SOME_USER} deleting={true} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });
});

describe("RoleChangeDialog", () => {
  it("does not render as open when pending is null", () => {
    render(<RoleChangeDialog pending={null} saving={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("names the user and target role, and calls onConfirm when confirmed", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <RoleChangeDialog
        pending={{ user: SOME_USER, role: "admin" }}
        saving={false}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText(/pyxie/)).toBeInTheDocument();
    expect(screen.getByText(/admin/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
