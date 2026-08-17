// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { User } from "@pyxie/api-client";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import UsersTable from "../../src/components/UsersTable";

const USERS: User[] = [
  {
    id: "1",
    username: "pyxie",
    email: "pyxie@example.com",
    role: "user",
    is_verified: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    settings: {
      theme: { name: "Pyxie (Default)" },
      reminder: { enabled: false, time: null },
      notifications: { enabled: false },
    },
  },
  {
    id: "2",
    username: "admin-jane",
    email: "jane@example.com",
    role: "admin",
    is_verified: true,
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-02-15T00:00:00Z",
    settings: {
      theme: { name: "Pyxie (Default)" },
      reminder: { enabled: false, time: null },
      notifications: { enabled: false },
    },
  },
];

describe("UsersTable", () => {
  it("renders one row per user with username, email, role, and created date", () => {
    render(<UsersTable users={USERS} onEdit={vi.fn()} onRoleChange={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("pyxie")).toBeInTheDocument();
    expect(screen.getByText("pyxie@example.com")).toBeInTheDocument();
    expect(screen.getByText("admin-jane")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText(new Date(USERS[1].created_at).toLocaleDateString())).toBeInTheDocument();
  });

  it("calls onEdit with the row's user when the edit button is clicked", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<UsersTable users={USERS} onEdit={onEdit} onRoleChange={vi.fn()} onDelete={vi.fn()} />);

    // Row also contains two TruncatedText popover triggers (role="button") before the edit/delete icon
    // buttons, so the action buttons are the last two in the row rather than the first two.
    const rows = screen.getAllByRole("row");
    const [editButton] = within(rows[1]).getAllByRole("button").slice(-2);
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(USERS[0]);
  });

  it("calls onDelete with the row's user when the delete button is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<UsersTable users={USERS} onEdit={vi.fn()} onRoleChange={vi.fn()} onDelete={onDelete} />);

    const rows = screen.getAllByRole("row");
    const [, deleteButton] = within(rows[1]).getAllByRole("button").slice(-2);
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(USERS[0]);
  });

  it("calls onRoleChange when a different role is picked", async () => {
    const user = userEvent.setup();
    const onRoleChange = vi.fn();
    render(<UsersTable users={USERS} onEdit={vi.fn()} onRoleChange={onRoleChange} onDelete={vi.fn()} />);

    const [userRoleSelect] = screen.getAllByRole("combobox");
    await user.click(userRoleSelect);
    await user.click(await screen.findByRole("option", { name: "admin" }));

    expect(onRoleChange).toHaveBeenCalledWith(USERS[0], "admin");
  });

  it("does not call onRoleChange when the current role is re-selected", async () => {
    const user = userEvent.setup();
    const onRoleChange = vi.fn();
    render(<UsersTable users={USERS} onEdit={vi.fn()} onRoleChange={onRoleChange} onDelete={vi.fn()} />);

    const [userRoleSelect] = screen.getAllByRole("combobox");
    await user.click(userRoleSelect);
    await user.click(await screen.findByRole("option", { name: "user" }));

    expect(onRoleChange).not.toHaveBeenCalled();
  });
});
