// SPDX-License-Identifier: AGPL-3.0-or-later
import type { EntryCard, SpreadPosition } from "@pyxie/api-client";
import { diaryEntriesAPI } from "@pyxie/api-client";
import { LoadingProvider } from "@pyxie/providers";
import { toast } from "@pyxie/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub, Link } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import EntryReview from "./EntryReview";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return {
    ...actual,
    decksAPI: { ...actual.decksAPI, listDecks: vi.fn().mockResolvedValue([]) },
    diaryEntriesAPI: { ...actual.diaryEntriesAPI, updateDiaryEntry: vi.fn() },
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
      path: "/spread",
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
      <Stub initialEntries={["/spread"]} />
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
});
