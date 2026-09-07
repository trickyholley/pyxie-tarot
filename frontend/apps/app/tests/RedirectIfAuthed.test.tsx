// SPDX-License-Identifier: AGPL-3.0-or-later
import { useAuth } from "@pyxie/providers";
import { makeTestUser, mockAuthValue } from "@pyxie/providers/src/testUtils.ts";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSplashPhase } from "../src/lib/splashHold";
import RedirectIfAuthed from "../src/RedirectIfAuthed";

// Partial mock - SplashScreen's Logo reads LoadingContext/ThemeContext from this same package.
vi.mock("@pyxie/providers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pyxie/providers")>()),
  useAuth: vi.fn(),
}));

// Driven per case rather than by the real clock: these assert which branch auth resolves to, so the
// splash's own timing is splashHold.test.ts's job.
vi.mock("@/lib/splashHold.ts", () => ({ useSplashPhase: vi.fn() }));

// No i18n instance is initialised in tests, so useTranslation would warn and echo the key back.
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

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
  beforeEach(() => {
    vi.mocked(useSplashPhase).mockReturnValue("gone");
  });

  it("shows the splash screen, not the login form, while loading", () => {
    vi.mocked(useSplashPhase).mockReturnValue("visible");
    vi.mocked(useAuth).mockReturnValue(mockAuthValue({ user: null, loading: true }));

    renderWithRouter();

    expect(screen.getByAltText("Pyxie Tarot")).toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });

  it("renders the nested route content when there is no user", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthValue({ user: null }));

    renderWithRouter();

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects to /home when a user is already present", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthValue({ user: makeTestUser() }));

    renderWithRouter();

    expect(screen.getByText("Home page")).toBeInTheDocument();
  });
});
