// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import BottomNav from "./BottomNav";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  );
}

describe("BottomNav", () => {
  it("highlights Home when drawing a spread", () => {
    renderAt("/spread");

    expect(screen.getByText("Home").closest("a")).toHaveClass("bg-primary");
    expect(screen.getByText("Diary").closest("a")).not.toHaveClass("bg-primary");
  });

  it("highlights Diary when viewing a diary entry", () => {
    renderAt("/diary/abc123");

    expect(screen.getByText("Diary").closest("a")).toHaveClass("bg-primary");
    expect(screen.getByText("Home").closest("a")).not.toHaveClass("bg-primary");
  });

  it("highlights Settings on the settings page", () => {
    renderAt("/settings");

    expect(screen.getByText("Settings").closest("a")).toHaveClass("bg-primary");
  });
});
