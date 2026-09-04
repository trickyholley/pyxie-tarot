// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import RequireAuth from "../src/RequireAuth";
import { makeTestUser, mockAuthValue } from "../src/testUtils.ts";
import useAuth from "../src/useAuth";

vi.mock("../src/useAuth");

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
    vi.mocked(useAuth).mockReturnValue(mockAuthValue({ user: null, loading: true }));

    const { container } = renderWithRouter();

    expect(container).toBeEmptyDOMElement();
  });

  it("redirects to /login when there is no user", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthValue({ user: null }));

    renderWithRouter();

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders the nested route content when a user is present", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthValue({ user: makeTestUser() }));

    renderWithRouter();

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
