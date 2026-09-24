// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { Spread, User } from "@pyxie/api-client";
import { spreadsAPI } from "@pyxie/api-client";
import { LoadingProvider, useAuth } from "@pyxie/providers";
import { makeTestUser, mockAuthValue } from "@pyxie/providers/src/testUtils.ts";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SpreadPicker from "../../src/create-entry/SpreadPicker";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, spreadsAPI: { ...actual.spreadsAPI, listSpreads: vi.fn() } };
});

vi.mock("@pyxie/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/providers")>();
  return { ...actual, useAuth: vi.fn() };
});

function renderPicker(onDrawn: (...args: unknown[]) => void, userOverrides: Partial<User> = {}) {
  vi.mocked(useAuth).mockReturnValue(
    mockAuthValue({ user: makeTestUser({ licence_is_active: true, ...userOverrides }) }),
  );
  return render(
    <MemoryRouter>
      <LoadingProvider>
        <SpreadPicker onDrawn={onDrawn} />
      </LoadingProvider>
    </MemoryRouter>,
  );
}

const SPREADS: Spread[] = [
  {
    id: "spread-1",
    name: "Single Card",
    description: null,
    num_cards: 1,
    positions: [{ index: 0, label: "Center", x: 0.5, y: 0.5, rotation: 0, scale: 1 }],
    prompts: ["What do you notice?"],
    allow_reversed: true,
    user_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("SpreadPicker", () => {
  it("renders spread names once loaded", async () => {
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue(SPREADS);
    renderPicker(vi.fn());

    // The label also renders (hidden) inside the closed dropdown's listbox, so scope the query
    // to the trigger to avoid an ambiguous match.
    const trigger = screen.getByRole("combobox");
    expect(await within(trigger).findByText("Single Card (1 card)")).toBeInTheDocument();
  });

  it("calls onDrawn with a draw of the right length when confirmed", async () => {
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue(SPREADS);
    const onDrawn = vi.fn();
    const user = userEvent.setup();
    renderPicker(onDrawn);

    await user.click(await screen.findByRole("button", { name: "Go" }));

    expect(onDrawn).toHaveBeenCalledTimes(1);
    const [spread, cards, mode, canvasType] = onDrawn.mock.calls[0];
    expect(spread.id).toBe("spread-1");
    expect(cards).toHaveLength(1);
    expect(mode).toBe("auto");
    expect(canvasType).toBe("virtual");
  });

  it("navigates to /spreads/create with a returnTo of /reading when the create-your-own link is clicked", async () => {
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue(SPREADS);
    const user = userEvent.setup();
    renderPicker(vi.fn());

    await user.click(await screen.findByRole("button", { name: "Create your own spread with the Spreaditor™!" }));

    expect(navigateMock).toHaveBeenCalledWith("/settings/spreads/create", { state: { returnTo: "/reading" } });
  });

  it("opens the full view dialog, showing the selected spread's details, when Preview is clicked", async () => {
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue(SPREADS);
    const user = userEvent.setup();
    renderPicker(vi.fn());

    await user.click(await screen.findByRole("button", { name: "Preview" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("What do you notice?")).toBeInTheDocument();
  });

  it("calls onDrawn with no cards when Manual selection is chosen", async () => {
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue(SPREADS);
    const onDrawn = vi.fn();
    const user = userEvent.setup();
    renderPicker(onDrawn);

    await user.click(await screen.findByRole("radio", { name: "Manual" }));
    await user.click(screen.getByRole("button", { name: "Go" }));

    expect(onDrawn).toHaveBeenCalledTimes(1);
    const [spread, cards, mode] = onDrawn.mock.calls[0];
    expect(spread.id).toBe("spread-1");
    expect(cards).toHaveLength(0);
    expect(mode).toBe("manual");
  });

  it("forces Manual selection (and disables Auto) once Photo canvas is chosen", async () => {
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue(SPREADS);
    const onDrawn = vi.fn();
    const user = userEvent.setup();
    renderPicker(onDrawn);

    await user.click(await screen.findByRole("radio", { name: "Photo" }));

    expect(screen.getByRole("radio", { name: "Auto" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Manual" })).toHaveAttribute("aria-checked", "true");

    await user.click(screen.getByRole("button", { name: "Go" }));

    expect(onDrawn).toHaveBeenCalledTimes(1);
    const [, cards, mode, canvasType] = onDrawn.mock.calls[0];
    expect(cards).toHaveLength(0);
    expect(mode).toBe("manual");
    expect(canvasType).toBe("photo");
  });

  it("disables the whole Canvas switch for a user without an active licence", async () => {
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue(SPREADS);
    renderPicker(vi.fn(), { licence_is_active: false });

    expect(await screen.findByRole("radio", { name: "Photo" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Virtual" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Photo canvas is only available to supporters." })).toHaveAttribute(
      "href",
      "/settings/supporter",
    );
  });

  // TODO: Shouldn't test solo spread here - ensure it's tested for the correct component
});
