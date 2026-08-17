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
import EntryReview from "../../src/create-entry/EntryReview";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return {
    ...actual,
    decksAPI: { ...actual.decksAPI, listDecks: vi.fn().mockResolvedValue([]) },
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

const DEFAULT_PROPS: Parameters<typeof EntryReview>[0] = {
  positions: POSITIONS,
  promptTexts: PROMPT_TEXTS,
  cards: CARDS,
  entryId: "entry-1",
  entryDate: "2026-02-15",
  spreadName: "Single Card",
  numCards: 3,
  initialEntryText: "",
  initialReplies: [],
  skipReveal: false,
  saveToDiary: true,
  onSubmitted: vi.fn(),
};

// Only the next flippable position renders with the `cursor-pointer` class, so this always
// targets the right card without needing to know its on-screen coordinates.
function renderEntryReview(props: Partial<Parameters<typeof EntryReview>[0]>) {
  const Stub = createRoutesStub([
    {
      path: "/reading",
      Component: () => (
        <>
          <EntryReview {...DEFAULT_PROPS} {...props} />
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

async function revealAllCards(container: HTMLElement, user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < POSITIONS.length; i++) {
    const card = container.querySelector<HTMLElement>(".cursor-pointer");
    if (!card) throw new Error("expected a revealable card");
    await user.click(card);
  }
}

describe("EntryReview", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("queues the reflection locally instead of PATCHing when entryId is already a locally-queued draft", async () => {
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    const { container } = renderEntryReview({ entryId: "local:draft-1", onSubmitted });

    await revealAllCards(container, user);
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Save entry" }));

    await vi.waitFor(() => expect(onSubmitted).toHaveBeenCalled());
    expect(diaryEntriesAPI.updateDiaryEntry).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Entry saved on this device - will sync once you're back online");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("queues the reflection locally and still succeeds when the submit PATCH fails offline", async () => {
    vi.mocked(diaryEntriesAPI.updateDiaryEntry).mockRejectedValue(new TypeError("Failed to fetch"));
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    const { container } = renderEntryReview({ onSubmitted });

    await revealAllCards(container, user);
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Save entry" }));

    await vi.waitFor(() => expect(onSubmitted).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith("Entry saved on this device - will sync once you're back online");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("keeps the reflect fields hidden until every card is revealed, then shows them after Continue", async () => {
    const user = userEvent.setup();
    const { container } = renderEntryReview({});

    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
    expect(screen.queryByText("What surprised you?")).not.toBeInTheDocument();

    await revealAllCards(container, user);
    await user.click(await screen.findByRole("button", { name: "Continue" }));

    expect(screen.getByText("My thoughts")).toBeInTheDocument();
    expect(screen.getByText("Guided questions")).toBeInTheDocument();
    expect(screen.getByText("What surprised you?")).toBeInTheDocument();
    expect(screen.getByText("What will you carry forward?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
  });

  it("lists every position's label below the canvas, fading in card names only as they're revealed", async () => {
    const user = userEvent.setup();
    const { container } = renderEntryReview({});

    await user.click(screen.getByRole("button", { name: "Card positions" }));

    expect(screen.getByText(/Position 0/)).toBeInTheDocument();
    expect(screen.getByText(/Position 1/)).toBeInTheDocument();
    expect(screen.getByText("The Fool")).toHaveClass("opacity-0");

    const card = container.querySelector<HTMLElement>(".cursor-pointer");
    if (!card) throw new Error("expected a revealable card");
    await user.click(card);

    expect(screen.getByText("The Fool")).toHaveClass("opacity-100");
    expect(screen.getByText("The Magician")).toHaveClass("opacity-0");
  });

  it("skips straight to the reflect fields, already filled in, when resuming a draft", () => {
    renderEntryReview({
      skipReveal: true,
      initialEntryText: "Something I noticed.",
      initialReplies: ["A reply", ""],
    });

    expect(screen.getByText("My thoughts")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Something I noticed.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A reply")).toBeInTheDocument();
  });

  it("submits the reflection via PATCH and marks the entry submitted, then calls onSubmitted", async () => {
    vi.mocked(diaryEntriesAPI.updateDiaryEntry).mockResolvedValue({} as never);
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    const { container } = renderEntryReview({ onSubmitted });

    await revealAllCards(container, user);
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Save entry" }));

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
    const { container } = renderEntryReview({ onSubmitted });

    await revealAllCards(container, user);
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Save entry" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to save entry"));
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it("retries the failed autosave on submit, then saves the reflection against the recovered entry", async () => {
    vi.mocked(diaryEntriesAPI.updateDiaryEntry).mockResolvedValue({} as never);
    const onSubmitted = vi.fn();
    const retryAutosave = vi.fn().mockResolvedValue("entry-2");
    const user = userEvent.setup();
    const { container } = renderEntryReview({ entryId: null, retryAutosave, onSubmitted });

    await revealAllCards(container, user);
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Save entry" }));

    await vi.waitFor(() => expect(retryAutosave).toHaveBeenCalled());
    expect(diaryEntriesAPI.updateDiaryEntry).toHaveBeenCalledWith(
      "entry-2",
      expect.objectContaining({ submitted: true }),
    );
    await vi.waitFor(() => expect(onSubmitted).toHaveBeenCalled());
  });

  it("shows a real error instead of a false success when the draft was never saved and can't be recovered", async () => {
    vi.mocked(diaryEntriesAPI.updateDiaryEntry).mockClear();
    const onSubmitted = vi.fn();
    const retryAutosave = vi.fn().mockRejectedValue(new Error("still failing"));
    const user = userEvent.setup();
    const { container } = renderEntryReview({ entryId: null, retryAutosave, onSubmitted });

    await revealAllCards(container, user);
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Save entry" }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to save entry"));
    expect(diaryEntriesAPI.updateDiaryEntry).not.toHaveBeenCalled();
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it("warns that the reading hasn't saved yet (rather than claiming the cards are safe) when the autosave failed", async () => {
    const user = userEvent.setup();
    renderEntryReview({ entryId: null });

    await user.click(screen.getByRole("link", { name: "Home" }));

    expect(await screen.findByText("This reading hasn't saved yet. Leaving now will lose it.")).toBeInTheDocument();
  });

  it("still shows the journaling fields but skips the diary API call when saveToDiary is false", async () => {
    vi.mocked(diaryEntriesAPI.updateDiaryEntry).mockClear();
    const onSubmitted = vi.fn();
    const user = userEvent.setup();
    const { container } = renderEntryReview({ saveToDiary: false, entryId: null, onSubmitted });

    await revealAllCards(container, user);
    await user.click(await screen.findByRole("button", { name: "Continue" }));

    expect(screen.getByText("What surprised you?")).toBeInTheDocument();
    expect(screen.getByText("My thoughts")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(diaryEntriesAPI.updateDiaryEntry).not.toHaveBeenCalled();
    expect(onSubmitted).toHaveBeenCalled();
  });

  it("asks for confirmation before an in-app navigation away from the reading", async () => {
    const user = userEvent.setup();
    renderEntryReview({});

    await user.click(screen.getByRole("link", { name: "Home" }));

    expect(await screen.findByText("Leave this reading?")).toBeInTheDocument();
    expect(screen.queryByText("Home page")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Leave" }));

    await vi.waitFor(() => expect(screen.getByText("Home page")).toBeInTheDocument());
  });

  it("stays on the page when the leave confirmation is dismissed", async () => {
    const user = userEvent.setup();
    renderEntryReview({});

    await user.click(screen.getByRole("link", { name: "Home" }));
    await user.click(await screen.findByRole("button", { name: "Stay" }));

    expect(screen.queryByText("Leave this reading?")).not.toBeInTheDocument();
    expect(screen.queryByText("Home page")).not.toBeInTheDocument();
  });

  it("warns that a free reading isn't saved at all, rather than talking about unsaved reflection", async () => {
    const user = userEvent.setup();
    renderEntryReview({ saveToDiary: false, entryId: null });

    await user.click(screen.getByRole("link", { name: "Home" }));

    expect(await screen.findByText("Free readings are not saved. Are you ready to leave?")).toBeInTheDocument();
  });
});
