// SPDX-License-Identifier: AGPL-3.0-or-later
import { authAPI } from "@pyxie/api-client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ResetPassword from "./ResetPassword";

vi.mock("@pyxie/api-client", () => ({
  authAPI: { confirmPasswordReset: vi.fn() },
}));

function renderResetPassword() {
  const router = createMemoryRouter(
    [
      { path: "/reset-password", element: <ResetPassword /> },
      { path: "/login", element: <p>Login page</p> },
    ],
    { initialEntries: ["/reset-password?token=abc123"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("ResetPassword (app)", () => {
  it("confirms the reset using the token from the URL", async () => {
    const user = userEvent.setup();
    vi.mocked(authAPI.confirmPasswordReset).mockResolvedValue(undefined);

    renderResetPassword();
    await user.type(screen.getByLabelText("New password"), "newpassword1");
    await user.type(screen.getByLabelText("Confirm password"), "newpassword1");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(authAPI.confirmPasswordReset).toHaveBeenCalledWith({ token: "abc123", new_password: "newpassword1" });
  });

  it("navigates back to login after resetting", async () => {
    const user = userEvent.setup();
    vi.mocked(authAPI.confirmPasswordReset).mockResolvedValue(undefined);

    renderResetPassword();
    await user.type(screen.getByLabelText("New password"), "newpassword1");
    await user.type(screen.getByLabelText("Confirm password"), "newpassword1");
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    await user.click(await screen.findByRole("button", { name: "Back to login" }));

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
});
