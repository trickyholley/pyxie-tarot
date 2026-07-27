import { useAuth } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Settings from "./Settings";

vi.mock("@pyxie/providers", () => ({
  useAuth: vi.fn(),
}));

describe("Settings", () => {
  it("logs out and navigates to /login when the log out button is clicked", async () => {
    const logout = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login: vi.fn(), logout });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(logout).toHaveBeenCalled();
  });
});
