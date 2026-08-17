// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { Spread } from "@pyxie/api-client";
import { spreadsAPI } from "@pyxie/api-client";
import { LoadingProvider } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SpreadsSettings from "../src/SpreadsSettings";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return {
    ...actual,
    spreadsAPI: { ...actual.spreadsAPI, listSpreads: vi.fn(), deleteSpread: vi.fn() },
  };
});

const SYSTEM_SPREAD: Spread = {
  id: "system-1",
  name: "Celtic Cross",
  description: null,
  num_cards: 10,
  positions: [],
  prompts: [],
  allow_reversed: true,
  user_id: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const CUSTOM_SPREAD: Spread = {
  ...SYSTEM_SPREAD,
  id: "custom-1",
  name: "My Spread",
  num_cards: 3,
  user_id: "user-1",
};

function renderPage() {
  return render(
    <MemoryRouter>
      <LoadingProvider>
        <SpreadsSettings />
      </LoadingProvider>
    </MemoryRouter>,
  );
}

describe("SpreadsSettings", () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it("lists only the user's own custom spreads, not system spreads", async () => {
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue([SYSTEM_SPREAD, CUSTOM_SPREAD]);
    renderPage();

    expect(await screen.findByText("My Spread")).toBeInTheDocument();
    expect(screen.queryByText("Celtic Cross")).not.toBeInTheDocument();
  });

  it("shows an empty state when the user has no custom spreads", async () => {
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue([SYSTEM_SPREAD]);
    renderPage();

    expect(await screen.findByText("You haven't created any spreads yet.")).toBeInTheDocument();
  });

  it("navigates to the create route", async () => {
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Create spread" }));

    expect(navigateMock).toHaveBeenCalledWith("/settings/spreads/create");
  });

  it("navigates to the edit route for a spread", async () => {
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue([CUSTOM_SPREAD]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Edit My Spread" }));

    expect(navigateMock).toHaveBeenCalledWith("/settings/spreads/custom-1/edit");
  });

  it("deletes a spread after confirming", async () => {
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue([CUSTOM_SPREAD]);
    vi.mocked(spreadsAPI.deleteSpread).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Delete My Spread" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(spreadsAPI.deleteSpread).toHaveBeenCalledWith("custom-1");
    expect(screen.queryByText("My Spread")).not.toBeInTheDocument();
  });
});
