import { useAuth } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import RequireAuth from "./RequireAuth";

vi.mock("@pyxie/providers", () => ({
  useAuth: vi.fn(),
}));

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/protected" element={<RequireAuth />}>
          <Route index element={<div>Protected content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  it("renders nothing while loading", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: true, login: vi.fn(), logout: vi.fn() });

    const { container } = renderWithRouter();

    expect(container).toBeEmptyDOMElement();
  });

  it("redirects to /login when there is no user", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login: vi.fn(), logout: vi.fn() });

    renderWithRouter();

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders the nested route content when a user is present", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "1",
        email: "a@b.com",
        username: "a",
        role: "user",
        is_verified: true,
        created_at: "",
        updated_at: "",
      },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter();

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
