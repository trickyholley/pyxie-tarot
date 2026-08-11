// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { Spread } from "@pyxie/api-client";
import { spreadsAPI } from "@pyxie/api-client";
import { LoadingProvider } from "@pyxie/providers";
import { toast } from "@pyxie/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SpreadEditor from "./SpreadEditor";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return {
    ...actual,
    spreadsAPI: {
      ...actual.spreadsAPI,
      getSpread: vi.fn(),
      createSpread: vi.fn(),
      updateSpread: vi.fn(),
    },
  };
});

vi.mock("@pyxie/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/ui")>();
  return { ...actual, toast: { ...actual.toast, error: vi.fn() } };
});

const EXISTING_SPREAD: Spread = {
  id: "spread-1",
  name: "Three Card",
  description: "A classic",
  num_cards: 1,
  positions: [{ index: 0, label: "Now", x: 0.5, y: 0.5, rotation: 0, scale: 1 }],
  prompts: ["What now?"],
  allow_reversed: true,
  user_id: "user-1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function renderEditor(initialPath: string) {
  const Stub = createRoutesStub([
    { path: "/settings/spreads/create", Component: SpreadEditor },
    { path: "/settings/spreads/:spreadId/edit", Component: SpreadEditor },
    { path: "/settings/spreads", Component: () => <p>Spreads list</p> },
  ]);
  return render(
    <LoadingProvider>
      <Stub initialEntries={[initialPath]} />
    </LoadingProvider>,
  );
}

describe("SpreadEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a spread from a blank form and navigates back to the list", async () => {
    vi.mocked(spreadsAPI.createSpread).mockResolvedValue(EXISTING_SPREAD);
    const user = userEvent.setup();
    renderEditor("/settings/spreads/create");

    await user.type(screen.getByLabelText("Name"), "My Spread");
    await user.type(screen.getByPlaceholderText("Label"), "Now");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(spreadsAPI.createSpread).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "My Spread",
        positions: [expect.objectContaining({ label: "Now" })],
      }),
    );
    expect(await screen.findByText("Spreads list")).toBeInTheDocument();
  });

  it("fetches and pre-fills an existing spread in edit mode, then saves it", async () => {
    vi.mocked(spreadsAPI.getSpread).mockResolvedValue(EXISTING_SPREAD);
    vi.mocked(spreadsAPI.updateSpread).mockResolvedValue(EXISTING_SPREAD);
    const user = userEvent.setup();
    renderEditor("/settings/spreads/spread-1/edit");

    expect(await screen.findByDisplayValue("Three Card")).toBeInTheDocument();
    expect(spreadsAPI.getSpread).toHaveBeenCalledWith("spread-1");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(spreadsAPI.updateSpread).toHaveBeenCalledWith("spread-1", expect.objectContaining({ name: "Three Card" }));
    expect(await screen.findByText("Spreads list")).toBeInTheDocument();
  });

  it("blocks submission and shows a toast when a position has no label", async () => {
    const user = userEvent.setup();
    renderEditor("/settings/spreads/create");

    await user.type(screen.getByLabelText("Name"), "My Spread");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(toast.error).toHaveBeenCalledWith("Give every position a label");
    expect(spreadsAPI.createSpread).not.toHaveBeenCalled();
  });
});
