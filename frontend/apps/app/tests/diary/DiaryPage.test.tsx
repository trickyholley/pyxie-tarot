// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DiaryPage from "../../src/diary/DiaryPage";

vi.mock("../../src/diary/EntryList", () => ({ default: () => <p>entry list view</p> }));
vi.mock("../../src/diary/EntryCalendar", () => ({ default: () => <p>entry calendar view</p> }));

// Tailwind's `hidden` class isn't backed by a loaded stylesheet in jsdom, so jest-dom's
// `toBeVisible()` can't see it — assert on the class directly instead.
function wrapperFor(text: string) {
  const wrapper = screen.getByText(text).parentElement;
  if (!wrapper) throw new Error(`expected "${text}" to have a parent element`);
  return wrapper;
}

describe("DiaryPage", () => {
  it("shows the calendar view by default and lazily mounts the list view on toggle", async () => {
    const user = userEvent.setup();
    render(<DiaryPage />);

    expect(wrapperFor("entry calendar view")).not.toHaveClass("hidden");
    expect(screen.queryByText("entry list view")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "List" }));

    expect(wrapperFor("entry list view")).not.toHaveClass("hidden");
    expect(wrapperFor("entry calendar view")).toHaveClass("hidden");
  });

  it("keeps a previously shown view mounted (just hidden) instead of re-fetching on switch back", async () => {
    const user = userEvent.setup();
    render(<DiaryPage />);

    await user.click(screen.getByRole("button", { name: "List" }));
    await user.click(screen.getByRole("button", { name: "Calendar" }));

    expect(wrapperFor("entry calendar view")).not.toHaveClass("hidden");
    expect(wrapperFor("entry list view")).toHaveClass("hidden");
  });
});
