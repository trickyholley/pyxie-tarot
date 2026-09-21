// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { DiaryEntry, PaginatedUserDiaryEntries, Spread } from "@pyxie/api-client";
import { decksAPI, diaryEntriesAPI, spreadsAPI } from "@pyxie/api-client";
import { LoadingProvider, useAuth } from "@pyxie/providers";
import { makeTestUser, mockAuthValue } from "@pyxie/providers/src/testUtils.ts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import CreateEntryPage from "../../src/create-entry/CreateEntryPage";
import { makeDeckCard, SYSTEM_DECK } from "../fixtures";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return {
    ...actual,
    diaryEntriesAPI: { ...actual.diaryEntriesAPI, listDiaryEntries: vi.fn(), createDiaryEntry: vi.fn() },
    spreadsAPI: { ...actual.spreadsAPI, listSpreads: vi.fn() },
    decksAPI: { ...actual.decksAPI, listDecks: vi.fn().mockResolvedValue([]), listDeckCards: vi.fn() },
  };
});

vi.mock("@pyxie/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/providers")>();
  return { ...actual, useAuth: vi.fn() };
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
  vi.mocked(useAuth).mockReturnValue(mockAuthValue({ user: makeTestUser({ licence_is_active: true }) }));
  // EntryReview (rendered once the review step is reached) uses useBlocker, which needs a data
  // router - a plain MemoryRouter won't do.
  const Stub = createRoutesStub([
    { path: "/reading", Component: CreateEntryPage },
    { path: "/diary/:entryId", Component: () => <div>Entry detail</div> },
  ]);
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

  it("reveals the spread picker when Pull is clicked and there's no entry for today", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue(paginated([]));
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue(SPREADS);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Pull" }));

    expect(await screen.findByRole("button", { name: "Go" })).toBeInTheDocument();
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

  it("shows an enabled View button once today's daily entry is submitted, navigating to it", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue(paginated([{ ...BASE_ENTRY, submitted: true }]));
    const user = userEvent.setup();
    renderPage();

    const button = await screen.findByRole("button", { name: "View" });
    expect(button).toBeEnabled();

    await user.click(button);
    expect(await screen.findByText("Entry detail")).toBeInTheDocument();
  });

  it("still shows a plain Pull button for Quick even when today's daily entry is submitted", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue(paginated([{ ...BASE_ENTRY, submitted: true }]));
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue(SPREADS);
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("button", { name: "View" });
    await user.click(screen.getByRole("radio", { name: "Quick" }));
    await user.click(screen.getByRole("button", { name: "Pull" }));

    expect(await screen.findByRole("button", { name: "Go" })).toBeInTheDocument();
  });

  it("doesn't autosave a Manual pick until Continue is clicked", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue(paginated([]));
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue(SPREADS);
    vi.mocked(diaryEntriesAPI.createDiaryEntry).mockResolvedValue(BASE_ENTRY);
    vi.mocked(decksAPI.listDecks).mockResolvedValue([SYSTEM_DECK]);
    vi.mocked(decksAPI.listDeckCards).mockResolvedValue([makeDeckCard("the_fool")]);
    vi.mocked(diaryEntriesAPI.createDiaryEntry).mockClear();
    const user = userEvent.setup();
    const { container } = renderPage();

    await user.click(await screen.findByRole("button", { name: "Pull" }));
    await user.click(await screen.findByRole("radio", { name: "Manual" }));
    await user.click(screen.getByRole("button", { name: "Go" }));

    const position = container.querySelector<HTMLElement>(".cursor-pointer");
    if (!position) throw new Error("expected a pickable position");
    await user.click(position);
    await user.click(await screen.findByRole("button", { name: "The Fool" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));

    expect(diaryEntriesAPI.createDiaryEntry).not.toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: "Continue" }));

    expect(diaryEntriesAPI.createDiaryEntry).toHaveBeenCalledTimes(1);
    expect(diaryEntriesAPI.createDiaryEntry).toHaveBeenCalledWith(
      expect.objectContaining({ cards: [{ position_index: 0, card: "the_fool", reversed: false }] }),
    );
  });

  it("doesn't autosave an Auto draw until Continue is clicked", async () => {
    vi.mocked(diaryEntriesAPI.listDiaryEntries).mockResolvedValue(paginated([]));
    vi.mocked(spreadsAPI.listSpreads).mockResolvedValue(SPREADS);
    vi.mocked(diaryEntriesAPI.createDiaryEntry).mockResolvedValue(BASE_ENTRY);
    // A prior test in this file may have already called this - nothing resets shared mock call
    // history between tests, so clear it explicitly rather than asserting against a count that
    // depends on run order.
    vi.mocked(diaryEntriesAPI.createDiaryEntry).mockClear();
    const user = userEvent.setup();
    const { container } = renderPage();

    await user.click(await screen.findByRole("button", { name: "Pull" }));
    await user.click(screen.getByRole("button", { name: "Go" }));

    expect(diaryEntriesAPI.createDiaryEntry).not.toHaveBeenCalled();

    const card = container.querySelector<HTMLElement>(".cursor-pointer");
    if (!card) throw new Error("expected a revealable card");
    await user.click(card);

    expect(diaryEntriesAPI.createDiaryEntry).not.toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: "Continue" }));

    expect(diaryEntriesAPI.createDiaryEntry).toHaveBeenCalledTimes(1);
  });
});
