// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { User } from "@pyxie/api-client";
import { LoadingProvider, useAuth } from "@pyxie/providers";
import { toast } from "@pyxie/ui";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Profile from "./Profile";

vi.mock("@pyxie/api-client/src/api/users.ts", () => ({
  updateMyEmail: vi.fn(),
  updateMyPassword: vi.fn(),
  deleteMe: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@pyxie/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/providers")>();
  return { ...actual, useAuth: vi.fn() };
});

vi.mock("@pyxie/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/ui")>();
  return { ...actual, toast: { ...actual.toast, success: vi.fn(), error: vi.fn() } };
});

const navigateMock = vi.fn();

const { updateMyEmail, updateMyPassword, deleteMe } = await import("@pyxie/api-client/src/api/users.ts");

const baseUser: User = {
  id: "1",
  email: "a@b.com",
  username: "tarot-fan",
  role: "user",
  is_verified: true,
  created_at: "",
  updated_at: "",
  settings: {
    theme: { name: "Pyxie (Default)" },
    reminder: { enabled: false, time: null },
    notifications: { enabled: false },
  },
};

function renderProfile(logout = vi.fn(), updateUser = vi.fn()) {
  vi.mocked(useAuth).mockReturnValue({ user: baseUser, loading: false, login: vi.fn(), logout, updateUser });
  return render(
    <MemoryRouter>
      <LoadingProvider>
        <Profile />
      </LoadingProvider>
    </MemoryRouter>,
  );
}

// Both forms have their own "Current password"/"Save" fields - scope to the form that owns the
// section's one unambiguously-labeled field instead of querying those shared labels page-wide.
function emailForm() {
  return screen.getByLabelText("Email address").closest("form") as HTMLFormElement;
}

function passwordForm() {
  return screen.getByLabelText("New password").closest("form") as HTMLFormElement;
}

describe("Profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits the new email", async () => {
    vi.mocked(updateMyEmail).mockResolvedValue({ ...baseUser, email: "new@b.com", is_verified: false });
    const updateUser = vi.fn();
    const user = userEvent.setup();
    renderProfile(vi.fn(), updateUser);

    const form = within(emailForm());
    await user.clear(form.getByLabelText("Email address"));
    await user.type(form.getByLabelText("Email address"), "new@b.com");
    await user.click(form.getByRole("button", { name: "Save" }));

    expect(updateMyEmail).toHaveBeenCalledWith("new@b.com");
    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith({ ...baseUser, email: "new@b.com", is_verified: false }),
    );
  });

  it("shows an error toast when the email update fails", async () => {
    vi.mocked(updateMyEmail).mockRejectedValue(new Error("nope"));
    const user = userEvent.setup();
    renderProfile();

    const form = within(emailForm());
    await user.clear(form.getByLabelText("Email address"));
    await user.type(form.getByLabelText("Email address"), "new@b.com");
    await user.click(form.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it("keeps the save button disabled until all three password fields are filled", async () => {
    const user = userEvent.setup();
    renderProfile();

    const form = within(passwordForm());
    const saveButton = form.getByRole("button", { name: "Save" });
    expect(saveButton).toBeDisabled();

    await user.type(form.getByLabelText("Current password"), "oldpass1");
    expect(saveButton).toBeDisabled();

    await user.type(form.getByLabelText("New password"), "newpassword123");
    expect(saveButton).toBeDisabled();

    await user.type(form.getByLabelText("Confirm new password"), "newpassword123");
    expect(saveButton).not.toBeDisabled();
  });

  it("submits a password change", async () => {
    vi.mocked(updateMyPassword).mockResolvedValue(new Response(null, { status: 204 }));
    const user = userEvent.setup();
    renderProfile();

    const form = within(passwordForm());
    await user.type(form.getByLabelText("Current password"), "oldpass1");
    await user.type(form.getByLabelText("New password"), "newpassword123");
    await user.type(form.getByLabelText("Confirm new password"), "newpassword123");
    await user.click(form.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateMyPassword).toHaveBeenCalledWith("oldpass1", "newpassword123"));
  });

  it("blocks submission and warns when the new passwords don't match", async () => {
    const user = userEvent.setup();
    renderProfile();

    const form = within(passwordForm());
    await user.type(form.getByLabelText("Current password"), "oldpass1");
    await user.type(form.getByLabelText("New password"), "newpassword123");
    await user.type(form.getByLabelText("Confirm new password"), "different123");
    await user.click(form.getByRole("button", { name: "Save" }));

    expect(updateMyPassword).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("New passwords don't match.");
  });

  it("requires a password before the delete button is enabled", async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole("button", { name: "Delete account" }));
    const passwordInput = await screen.findByLabelText("Enter your password to confirm");
    // The dialog is modal - Base UI marks the rest of the page inert, so the card's trigger button
    // drops out of the accessibility tree and this now unambiguously matches the dialog's own button.
    const confirmButton = screen.getByRole("button", { name: "Delete account" });
    expect(confirmButton).toBeDisabled();

    await user.type(passwordInput, "hunter2pass");
    expect(confirmButton).not.toBeDisabled();
  });

  it("deletes the account, logs out, and redirects to /login on confirm", async () => {
    vi.mocked(deleteMe).mockResolvedValue(new Response(null, { status: 204 }));
    const logout = vi.fn();
    const user = userEvent.setup();
    renderProfile(logout);

    await user.click(screen.getByRole("button", { name: "Delete account" }));
    await user.type(await screen.findByLabelText("Enter your password to confirm"), "hunter2pass");
    await user.click(screen.getByRole("button", { name: "Delete account" }));

    expect(deleteMe).toHaveBeenCalledWith("hunter2pass");
    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(navigateMock).toHaveBeenCalledWith("/login");
  });

  it("shows an error toast and keeps the dialog open when the password is wrong", async () => {
    vi.mocked(deleteMe).mockRejectedValue(new Error("nope"));
    const logout = vi.fn();
    const user = userEvent.setup();
    renderProfile(logout);

    await user.click(screen.getByRole("button", { name: "Delete account" }));
    await user.type(await screen.findByLabelText("Enter your password to confirm"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Delete account" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(logout).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Enter your password to confirm")).toBeInTheDocument();
  });
});
