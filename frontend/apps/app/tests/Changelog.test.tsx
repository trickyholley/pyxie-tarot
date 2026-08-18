// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Changelog from "../src/Changelog.tsx";

vi.mock("../src/lib/changelogData.ts", () => ({
  CHANGELOG_ENTRIES: [
    { version: "0.3.0", date: "2026-08-01T00:00:00Z", message: "added diary calendar" },
    { version: "0.2.0", date: "2026-07-01T00:00:00Z", message: "added spreads" },
  ],
}));

describe("Changelog", () => {
  it("lists every patch note, newest first", () => {
    render(<Changelog />);

    const versions = screen.getAllByText(/^0\.\d$/).map((el) => el.textContent);
    expect(versions).toEqual(["0.3", "0.2"]); // version is formatted to drop the patch digit when it's 0
    expect(screen.getByText("added diary calendar")).toBeInTheDocument();
    expect(screen.getByText("added spreads")).toBeInTheDocument();
  });
});
