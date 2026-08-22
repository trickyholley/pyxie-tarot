// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Changelog from "../src/Changelog.tsx";

vi.mock("../src/lib/changelogData.ts", () => ({
  CHANGELOG_ENTRIES: [
    { version: "0.3.0", date: "2026-08-01T00:00:00Z", message: "added diary calendar" },
    { version: "0.2.0", date: "2026-07-01T00:00:00Z", message: "added spreads" },
  ],
}));

describe("Changelog", () => {
  it("lists every patch note's version and date, newest first, expanding to show its message", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Changelog />
      </MemoryRouter>,
    );

    // version is formatted to drop the patch digit when it's 0
    const versions = screen.getAllByText(/^0\.\d$/);
    expect(versions[0]).toHaveTextContent("0.3");
    expect(versions[1]).toHaveTextContent("0.2");
    expect(screen.getByText("Aug 1, 2026")).toBeInTheDocument();
    expect(screen.getByText("Jul 1, 2026")).toBeInTheDocument();

    const triggers = screen.getAllByRole("button");
    await user.click(triggers[0]);
    expect(screen.getByText("added diary calendar")).toBeInTheDocument();

    await user.click(triggers[1]);
    expect(screen.getByText("added spreads")).toBeInTheDocument();
  });
});
