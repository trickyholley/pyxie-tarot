// SPDX-License-Identifier: AGPL-3.0-or-later
import type { DiaryEntry, PaginatedUserDiaryEntries } from "@pyxie/api-client";
import { diaryEntriesAPI } from "@pyxie/api-client";
import { LoadingProvider } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Home from "./Home";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, diaryEntriesAPI: { ...actual.diaryEntriesAPI, listDiaryEntries: vi.fn() } };
});

const BASE_ENTRY: DiaryEntry = {
  id: "entry-1",
  user_id: "user-1",
  entry_date: "2026-02-15",
  entry_text: "",
  spread_name: "Single Card",
  num_cards: 1,
  positions: [{ index: 0, label: "Center", x: 0.5, y: 0.5, rotation: 0, scale: 1 }],
  cards: [{ position_index: 0, card: "the_fool", reversed: false }],
  prompts: [],
  submitted: false,
  created_at: "2026-02-15T00:00:00Z",
  updated_at: "2026-02-15T00:00:00Z",
};

function paginated(items: DiaryEntry[]): PaginatedUserDiaryEntries {
  return { items, total: items.length, skip: 0, limit: 1 };
}

function renderHome() {
  const Stub = createRoutesStub([{ path: "/home", Component: Home }]);
  return render(
    <LoadingProvider>
      <Stub initialEntries={["/home"]} />
    </LoadingProvider>,
  );
}

describe("Home", () => {
  it("shows an enabled Draw link to a fresh daily reading when there's no entry for today", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue(paginated([]));
    renderHome();

    const link = await screen.findByRole("button", { name: "Draw" });
    expect(link).toHaveAttribute("href", "/spread?type=daily");
  });

  it("shows an Edit link resuming the draft when today's daily entry hasn't been submitted", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue(paginated([{ ...BASE_ENTRY, submitted: false }]));
    renderHome();

    const link = await screen.findByRole("button", { name: "Edit" });
    expect(link).toHaveAttribute("href", "/diary/entry-1");
  });

  it("shows a disabled Submitted button once today's daily entry is submitted", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue(paginated([{ ...BASE_ENTRY, submitted: true }]));
    renderHome();

    const button = await screen.findByRole("button", { name: "Submitted" });
    expect(button).toBeDisabled();
  });

  it("still shows a plain Draw link for Quick even when today's daily entry is submitted", async () => {
    const user = userEvent.setup();
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue(paginated([{ ...BASE_ENTRY, submitted: true }]));
    renderHome();

    await screen.findByRole("button", { name: "Submitted" });
    await user.click(screen.getByRole("button", { name: "Quick" }));

    const link = screen.getByRole("button", { name: "Draw" });
    expect(link).toHaveAttribute("href", "/spread?type=free");
  });
});
