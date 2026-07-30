// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import HistoryPage from "./HistoryPage";

vi.mock("./EntryList", () => ({ default: () => <p>entry list view</p> }));
vi.mock("./EntryCalendar", () => ({ default: () => <p>entry calendar view</p> }));

describe("HistoryPage", () => {
  it("shows the list view by default and switches to the calendar view on toggle", async () => {
    const user = userEvent.setup();
    render(<HistoryPage />);

    expect(screen.getByText("entry list view")).toBeInTheDocument();
    expect(screen.queryByText("entry calendar view")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Calendar" }));

    expect(screen.getByText("entry calendar view")).toBeInTheDocument();
    expect(screen.queryByText("entry list view")).not.toBeInTheDocument();
  });
});
