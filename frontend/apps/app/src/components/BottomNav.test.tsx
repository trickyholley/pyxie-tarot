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
  it("highlights Home only on its exact root path", () => {
    renderAt("/home");

    expect(screen.getByText("Home").closest("a")).toHaveClass("bg-primary");
  });

  it("highlights Reading, not Home, when drawing a spread", () => {
    renderAt("/reading");

    expect(screen.getByText("Reading").closest("a")).toHaveClass("bg-primary");
    expect(screen.getByText("Home").closest("a")).not.toHaveClass("bg-primary");
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

  it("highlights Settings on the appearance picker sub-route", () => {
    renderAt("/settings/appearance");

    expect(screen.getByText("Settings").closest("a")).toHaveClass("bg-primary");
  });

  it("highlights Settings on the appearance editor sub-route", () => {
    renderAt("/settings/appearance/create");

    expect(screen.getByText("Settings").closest("a")).toHaveClass("bg-primary");
  });
});
