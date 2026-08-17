// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { DiaryEntry, PaginatedUserDiaryEntries, Spread } from "@pyxie/api-client";
import { diaryEntriesAPI, spreadsAPI } from "@pyxie/api-client";
import { LoadingProvider } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDateParam } from "@/lib/date";
import { queueNewEntry } from "@/lib/offlineDiaryEntry";
import CreateEntryPage from "../../src/create-entry/CreateEntryPage";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return {
    ...actual,
    diaryEntriesAPI: { ...actual.diaryEntriesAPI, listDiaryEntries: vi.fn(), createDiaryEntry: vi.fn() },
    spreadsAPI: { ...actual.spreadsAPI, listSpreads: vi.fn() },
  };
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

function paginated(items: DiaryEntry[]): PaginatedUserDiaryEntries {
  return { items, total: items.length, skip: 0, limit: 1 };
}

function renderPage() {
  // EntryReview (rendered once the review step is reached) uses useBlocker, which needs a data
  // router - a plain MemoryRouter won't do.
  const Stub = createRoutesStub([{ path: "/reading", Component: CreateEntryPage }]);
  return render(
    <LoadingProvider>
      <Stub initialEntries={["/reading"]} />
    </LoadingProvider>,
  );
}

describe("CreateEntryPage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("resumes a locally-queued draft in place when today's entry check is offline", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockRejectedValue(new TypeError("Failed to fetch"));
    vi.mocked(diaryEntriesAPI.createDiaryEntry).mockRejectedValue(new TypeError("Failed to fetch"));
    queueNewEntry(SPREADS[0], BASE_ENTRY.cards, formatDateParam(new Date()));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("textbox", { name: "My thoughts" })).toBeInTheDocument();
  });

  it("reveals the spread picker when Pull is clicked and there's no entry for today", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue(paginated([]));
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue(SPREADS);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Pull" }));

    expect(await screen.findByRole("button", { name: "Draw" })).toBeInTheDocument();
  });

  it("shows a disabled placeholder instead of guessing Pull until today's entry status has loaded", async () => {
    let resolve!: (value: PaginatedUserDiaryEntries) => void;
    const promise = new Promise<PaginatedUserDiaryEntries>((res) => {
      resolve = res;
    });
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockReturnValue(promise);
    renderPage();

    expect(screen.getByRole("button", { name: "Checking today's entry" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Pull" })).not.toBeInTheDocument();

    resolve(paginated([]));
    await screen.findByRole("button", { name: "Pull" });
  });

  it("resumes the draft in place, without navigating away, when today's daily entry hasn't been submitted", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue(paginated([{ ...BASE_ENTRY, submitted: false }]));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("textbox", { name: "My thoughts" })).toBeInTheDocument();
  });

  it("shows a disabled Submitted button once today's daily entry is submitted", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue(paginated([{ ...BASE_ENTRY, submitted: true }]));
    renderPage();

    const button = await screen.findByRole("button", { name: "Submitted" });
    expect(button).toBeDisabled();
  });

  it("still shows a plain Pull button for Quick even when today's daily entry is submitted", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue(paginated([{ ...BASE_ENTRY, submitted: true }]));
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue(SPREADS);
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("button", { name: "Submitted" });
    await user.click(screen.getByRole("button", { name: "Quick" }));
    await user.click(screen.getByRole("button", { name: "Pull" }));

    expect(await screen.findByRole("button", { name: "Draw" })).toBeInTheDocument();
  });
});
