// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RouteError from "../../src/components/RouteError";

const STRINGS = {
  title: "Something went wrong",
  message: "This page couldn't load.",
  retry: "Try again",
  goHome: "Home",
};

describe("RouteError", () => {
  it("renders the title and message", () => {
    render(<RouteError strings={STRINGS} homeHref="/home" />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("This page couldn't load.")).toBeInTheDocument();
  });

  it("links the home button to homeHref", () => {
    render(<RouteError strings={STRINGS} homeHref="/home" />);

    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute("href", "/home");
  });

  it("reloads the page when retry is clicked", async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", { writable: true, value: { ...originalLocation, reload } });

    render(<RouteError strings={STRINGS} homeHref="/home" />);
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(reload).toHaveBeenCalledOnce();
    Object.defineProperty(window, "location", { writable: true, value: originalLocation });
  });
});
