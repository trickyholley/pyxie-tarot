// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLastSeenVersion, markVersionSeen } from "@/lib/changelog.ts";
import WhatsNewModal from "../../src/components/WhatsNewModal.tsx";

vi.mock("@/lib/changelogData.ts", () => ({
  CHANGELOG_ENTRIES: [
    { version: "0.3.0", date: "2026-08-01T00:00:00Z", message: "added diary calendar" },
    { version: "0.2.0", date: "2026-07-01T00:00:00Z", message: "added spreads" },
  ],
}));

describe("WhatsNewModal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stays closed and starts tracking silently for a browser never seen before", () => {
    render(<WhatsNewModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(getLastSeenVersion()).toBe("0.3.0"); // newest entry in CHANGELOG, not the running build's own version
  });

  it("stays closed once the user is already caught up", () => {
    markVersionSeen("0.3.0");
    render(<WhatsNewModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows unseen notes, titled after the newest one, and records the newest version once dismissed", async () => {
    markVersionSeen("0.1.0");
    render(<WhatsNewModal />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/What's new in 0\.3/)).toBeInTheDocument();
    expect(screen.getByText(/added diary calendar/)).toBeInTheDocument();
    expect(screen.getByText(/added spreads/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /got it/i }));
    expect(getLastSeenVersion()).toBe("0.3.0");
  });
});
