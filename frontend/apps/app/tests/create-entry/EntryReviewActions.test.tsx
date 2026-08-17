// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { EntryCard, SpreadPosition } from "@pyxie/api-client";
import { diaryEntriesAPI } from "@pyxie/api-client";
import { LoadingProvider } from "@pyxie/providers";
import { toast } from "@pyxie/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub, Link } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import EntryReviewActions from "../../src/create-entry/EntryReviewActions";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return {
    ...actual,
    diaryEntriesAPI: { ...actual.diaryEntriesAPI, updateDiaryEntry: vi.fn(), createDiaryEntry: vi.fn() },
  };
});

vi.mock("@pyxie/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/ui")>();
  return { ...actual, toast: { ...actual.toast, success: vi.fn(), error: vi.fn() } };
});

const POSITIONS: SpreadPosition[] = [0, 1, 2].map((index) => ({
  index,
  label: `Position ${index}`,
  x: 0.5,
  y: 0.5,
  rotation: 0,
  scale: 1,
}));
const PROMPT_TEXTS = ["What surprised you?", "What will you carry forward?"];

const CARDS: EntryCard[] = [
  { position_index: 0, card: "the_fool", reversed: false },
  { position_index: 1, card: "the_magician", reversed: true },
  { position_index: 2, card: "the_sun", reversed: false },
];

const DEFAULT_PROPS: Parameters<typeof EntryReviewActions>[0] = {
  showButtons: true,
  entryId: "entry-1",
  entryDate: "2026-02-15",
  spreadName: "Single Card",
  numCards: 3,
  saveToDiary: true,
  entryText: "",
  replies: ["", ""],
  positions: POSITIONS,
  promptTexts: PROMPT_TEXTS,
  cards: CARDS,
  onSubmitted: vi.fn(),
  onDrafted: vi.fn(),
};

function renderEntryReviewActions(props: Partial<Parameters<typeof EntryReviewActions>[0]>) {
  const Stub = createRoutesStub([
    {
      path: "/reading",
      Component: () => (
        <>
          <EntryReviewActions {...DEFAULT_PROPS} {...props} />
          <Link to="/home">Home</Link>
        </>
      ),
    },
    { path: "/home", Component: () => <p>Home page</p> },
  ]);
  return render(
    <LoadingProvider>
      <Stub initialEntries={["/reading"]} />
    </LoadingProvider>,
  );
}

describe("EntryReviewActions", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("saves the entry as a draft via PATCH without marking it submitted, then calls onDrafted", async () => {
    vi.mocked(diaryEntriesAPI.updateDiaryEntry).mockResolvedValue({} as never);
    const onDrafted = vi.fn();
    const user = userEvent.setup();
    renderEntryReviewActions({ entryText: "A note.", replies: ["A reply", ""], onDrafted });

    await user.click(screen.getByRole("button", { name: "Finish later" }));

    await vi.waitFor(() =>
      expect(diaryEntriesAPI.updateDiaryEntry).toHaveBeenCalledWith("entry-1", {
        entry_text: "A note.",
        replies: ["A reply", ""],
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("Entry saved");
    await vi.waitFor(() => expect(onDrafted).toHaveBeenCalled());
  });

  it("queues the reflection locally instead of PATCHing when entryId is already a locally-queued draft", async () => {
    vi.mocked(diaryEntriesAPI.updateDiaryEntry).mockClear();
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    renderEntryReviewActions({ entryId: "local:draft-1", onSubmitted });

    await user.click(screen.getByRole("button", { name: "Complete entry" }));

    await vi.waitFor(() => expect(onSubmitted).toHaveBeenCalled());
    expect(diaryEntriesAPI.updateDiaryEntry).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Entry saved on this device - will sync once you're back online");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("queues the reflection locally and still succeeds when the submit PATCH fails offline", async () => {
    vi.mocked(diaryEntriesAPI.updateDiaryEntry).mockRejectedValue(new TypeError("Failed to fetch"));
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    renderEntryReviewActions({ onSubmitted });

    await user.click(screen.getByRole("button", { name: "Complete entry" }));

    await vi.waitFor(() => expect(onSubmitted).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith("Entry saved on this device - will sync once you're back online");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("submits the reflection via PATCH and marks the entry submitted, then calls onSubmitted", async () => {
    vi.mocked(diaryEntriesAPI.updateDiaryEntry).mockResolvedValue({} as never);
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    renderEntryReviewActions({ onSubmitted });

    await user.click(screen.getByRole("button", { name: "Complete entry" }));

    expect(diaryEntriesAPI.updateDiaryEntry).toHaveBeenCalledWith("entry-1", {
      entry_text: "",
      replies: ["", ""],
      submitted: true,
    });
    await vi.waitFor(() => expect(onSubmitted).toHaveBeenCalled());
  });

  it("shows an error toast and does not call onSubmitted when the API call rejects", async () => {
    vi.mocked(diaryEntriesAPI.updateDiaryEntry).mockRejectedValue(new Error("boom"));
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    renderEntryReviewActions({ onSubmitted });

    await user.click(screen.getByRole("button", { name: "Complete entry" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to save entry"));
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it("retries the failed autosave on submit, then saves the reflection against the recovered entry", async () => {
    vi.mocked(diaryEntriesAPI.updateDiaryEntry).mockResolvedValue({} as never);
    const onSubmitted = vi.fn();
    const retryAutosave = vi.fn().mockResolvedValue("entry-2");
    const user = userEvent.setup();
    renderEntryReviewActions({ entryId: null, retryAutosave, onSubmitted });

    await user.click(screen.getByRole("button", { name: "Complete entry" }));

    await vi.waitFor(() => expect(retryAutosave).toHaveBeenCalled());
    expect(diaryEntriesAPI.updateDiaryEntry).toHaveBeenCalledWith(
      "entry-2",
      expect.objectContaining({ submitted: true }),
    );
    await vi.waitFor(() => expect(onSubmitted).toHaveBeenCalled());
  });

  it("shows a real error instead of a false success when the entry was never saved and can't be recovered", async () => {
    vi.mocked(diaryEntriesAPI.updateDiaryEntry).mockClear();
    const onSubmitted = vi.fn();
    const retryAutosave = vi.fn().mockRejectedValue(new Error("still failing"));
    const user = userEvent.setup();
    renderEntryReviewActions({ entryId: null, retryAutosave, onSubmitted });

    await user.click(screen.getByRole("button", { name: "Complete entry" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to save entry"));
    expect(diaryEntriesAPI.updateDiaryEntry).not.toHaveBeenCalled();
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it("calls onSubmitted directly without a diary API call when saveToDiary is false", async () => {
    vi.mocked(diaryEntriesAPI.updateDiaryEntry).mockClear();
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    renderEntryReviewActions({ saveToDiary: false, entryId: null, onSubmitted });

    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(diaryEntriesAPI.updateDiaryEntry).not.toHaveBeenCalled();
    expect(onSubmitted).toHaveBeenCalled();
  });

  it("asks for confirmation before an in-app navigation away from the reading", async () => {
    const user = userEvent.setup();
    renderEntryReviewActions({});

    await user.click(screen.getByRole("link", { name: "Home" }));

    expect(await screen.findByText("Leave this reading?")).toBeInTheDocument();
    expect(screen.getByText("Any unsaved changes will be lost.")).toBeInTheDocument();
    expect(screen.queryByText("Home page")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Leave" }));

    await vi.waitFor(() => expect(screen.getByText("Home page")).toBeInTheDocument());
  });

  it("stays on the page when the leave confirmation is dismissed", async () => {
    const user = userEvent.setup();
    renderEntryReviewActions({});

    await user.click(screen.getByRole("link", { name: "Home" }));
    await user.click(await screen.findByRole("button", { name: "Stay" }));

    expect(screen.queryByText("Leave this reading?")).not.toBeInTheDocument();
    expect(screen.queryByText("Home page")).not.toBeInTheDocument();
  });
});
