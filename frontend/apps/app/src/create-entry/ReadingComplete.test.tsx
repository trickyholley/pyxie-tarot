// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub, Link } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ReadingComplete from "./ReadingComplete";

function renderReadingComplete(props: Parameters<typeof ReadingComplete>[0]) {
  const Stub = createRoutesStub([
    { path: "/spread", Component: () => <ReadingComplete {...props} /> },
    { path: "/home", Component: () => <p>Home page</p> },
  ]);
  return render(<Stub initialEntries={["/spread"]} />);
}

describe("ReadingComplete", () => {
  it("shows the saved-entry message when saveToDiary is true", () => {
    renderReadingComplete({ saveToDiary: true, onNewEntry: vi.fn() });
    expect(
      screen.getByText("Take a deep breath. Your words are recorded; your heart never forgets."),
    ).toBeInTheDocument();
  });

  it("shows the free-reading message when saveToDiary is false", () => {
    renderReadingComplete({ saveToDiary: false, onNewEntry: vi.fn() });
    expect(screen.getByText("Inhale, then exhale. Let it go.")).toBeInTheDocument();
  });

  it("calls onNewEntry after a delay, giving the logo time to fly back first", async () => {
    const onNewEntry = vi.fn();
    const user = userEvent.setup();
    renderReadingComplete({ saveToDiary: true, onNewEntry });

    await user.click(screen.getByRole("button", { name: "New entry" }));

    expect(onNewEntry).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(onNewEntry).toHaveBeenCalledTimes(1));
  });

  it("delays a bottom-nav-style navigation until the logo has time to fly back", async () => {
    const user = userEvent.setup();
    const Stub = createRoutesStub([
      {
        path: "/spread",
        Component: () => (
          <>
            <ReadingComplete saveToDiary={true} onNewEntry={vi.fn()} />
            <Link to="/home">Home</Link>
          </>
        ),
      },
      { path: "/home", Component: () => <p>Home page</p> },
    ]);
    render(<Stub initialEntries={["/spread"]} />);

    await user.click(screen.getByRole("link", { name: "Home" }));

    expect(screen.queryByText("Home page")).not.toBeInTheDocument();
    await vi.waitFor(() => expect(screen.getByText("Home page")).toBeInTheDocument());
  });
});
