// SPDX-License-Identifier: AGPL-3.0-or-later
import { useAuth } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import RedirectIfAuthed from "./RedirectIfAuthed";

vi.mock("@pyxie/providers", () => ({
  useAuth: vi.fn(),
}));

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/home" element={<div>Home page</div>} />
        <Route path="/login" element={<RedirectIfAuthed />}>
          <Route index element={<div>Login page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("RedirectIfAuthed", () => {
  it("renders nothing while loading", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    const { container } = renderWithRouter();

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the nested route content when there is no user", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    renderWithRouter();

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects to /home when a user is already present", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "1",
        email: "a@b.com",
        username: "a",
        role: "user",
        is_verified: true,
        created_at: "",
        updated_at: "",
        settings: {
          theme: { name: "Pyxie (Default)" },
          reminder: { enabled: false, time: null },
          notifications: { enabled: false },
        },
      },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    renderWithRouter();

    expect(screen.getByText("Home page")).toBeInTheDocument();
  });
});
