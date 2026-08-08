// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { DiaryEntry } from "@pyxie/api-client";
import { diaryEntriesAPI } from "@pyxie/api-client";
import { LoadingProvider } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import EntryDetail from "./EntryDetail";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return {
    ...actual,
    decksAPI: { ...actual.decksAPI, listDecks: vi.fn().mockResolvedValue([]) },
    diaryEntriesAPI: {
      ...actual.diaryEntriesAPI,
      getDiaryEntry: vi.fn(),
      updateDiaryEntry: vi.fn(),
    },
  };
});

const ENTRY: DiaryEntry = {
  id: "entry-1",
  user_id: "user-1",
  entry_date: "2026-02-15",
  entry_text: "A quiet reading.",
  spread_name: "Past, Present, Future",
  num_cards: 2,
  positions: [
    { index: 0, label: "Past", x: 0.2, y: 0.5, rotation: 0, scale: 1 },
    { index: 1, label: "Present", x: 0.8, y: 0.5, rotation: 0, scale: 1 },
  ],
  cards: [
    { position_index: 0, card: "the_fool", reversed: false },
    { position_index: 1, card: "the_sun", reversed: true },
  ],
  prompts: [{ prompt: "What surprised you?", reply: "The clarity." }],
  submitted: true,
  created_at: "2026-02-15T00:00:00Z",
  updated_at: "2026-02-15T00:00:00Z",
};

function renderEntryDetail() {
  const Stub = createRoutesStub([
    { path: "/diary/:entryId", Component: EntryDetail },
    { path: "/diary", Component: () => <p>Diary page</p> },
  ]);
  return render(
    <LoadingProvider>
      <Stub initialEntries={["/diary/entry-1"]} />
    </LoadingProvider>,
  );
}

describe("EntryDetail", () => {
  it("fetches the entry by id and renders its text, prompts, and cards read-only", async () => {
    vi.mocked(diaryEntriesAPI.getDiaryEntry).mockResolvedValue(ENTRY);

    renderEntryDetail();

    expect(await screen.findByText("A quiet reading.")).toBeInTheDocument();
    expect(diaryEntriesAPI.getDiaryEntry).toHaveBeenCalledWith("entry-1");
    expect(screen.getByText("Past, Present, Future")).toBeInTheDocument();
    expect(screen.getByText("What surprised you?")).toBeInTheDocument();
    expect(screen.getByText("The clarity.")).toBeInTheDocument();
  });

  it("shows a fallback for prompts with no reply", async () => {
    vi.mocked(diaryEntriesAPI.getDiaryEntry).mockResolvedValue({
      ...ENTRY,
      prompts: [{ prompt: "What surprised you?", reply: "" }],
    });

    renderEntryDetail();

    expect(await screen.findByText("No reply")).toBeInTheDocument();
  });

  it("renders an editable, prefilled reflect form (cards already revealed) for an unsubmitted draft", async () => {
    vi.mocked(diaryEntriesAPI.getDiaryEntry).mockResolvedValue({ ...ENTRY, submitted: false });

    renderEntryDetail();

    expect(await screen.findByText("Draft")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A quiet reading.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("The clarity.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save entry" })).toBeInTheDocument();
  });

  it("submits the draft's reflection, then navigates back to the diary", async () => {
    vi.mocked(diaryEntriesAPI.getDiaryEntry).mockResolvedValue({ ...ENTRY, submitted: false });
    vi.mocked(diaryEntriesAPI.updateDiaryEntry).mockResolvedValue(ENTRY);
    const user = userEvent.setup();

    renderEntryDetail();
    await screen.findByRole("button", { name: "Save entry" });

    await user.click(screen.getByRole("button", { name: "Save entry" }));

    await vi.waitFor(() =>
      expect(diaryEntriesAPI.updateDiaryEntry).toHaveBeenCalledWith("entry-1", {
        entry_text: "A quiet reading.",
        replies: ["The clarity."],
        submitted: true,
      }),
    );
    expect(await screen.findByText("Diary page")).toBeInTheDocument();
  });
});
