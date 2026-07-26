import { authAPI } from "@pyxie/api-client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ForgotPassword from "./ForgotPassword";

vi.mock("@pyxie/api-client", () => ({
  authAPI: { requestPasswordReset: vi.fn() },
}));

describe("ForgotPassword (admin)", () => {
  it("requests a password reset with the admin client", async () => {
    const user = userEvent.setup();
    vi.mocked(authAPI.requestPasswordReset).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText("Email"), "pyxie@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(authAPI.requestPasswordReset).toHaveBeenCalledWith({ email: "pyxie@example.com", client: "admin" });
  });
});
