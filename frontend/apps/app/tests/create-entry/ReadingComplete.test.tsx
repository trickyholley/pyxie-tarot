// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { DEFAULT_THEME, spreadExportAPI } from "@pyxie/api-client";
import { LoadingProvider } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub, Link } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReadingComplete from "../../src/create-entry/ReadingComplete";
import { SpreadExportData } from "../../src/lib/spreadExport";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, spreadExportAPI: { ...actual.spreadExportAPI, exportSpreadPdf: vi.fn() } };
});

vi.mock("@pyxie/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/providers")>();
  return { ...actual, useTheme: () => ({ theme: DEFAULT_THEME, setTheme: vi.fn() }) };
});

const EXPORT_DATA: SpreadExportData = {
  spreadName: "Single Card",
  entryDate: "2026-02-15",
  positions: [{ index: 0, label: "Center", x: 0.5, y: 0.5, rotation: 0, scale: 1 }],
  cards: [{ position_index: 0, card: "the_fool", reversed: false }],
  entryText: "A quiet reading.",
  prompts: [{ prompt: "What surprised you?", reply: "The clarity." }],
};

function renderReadingComplete(props: Partial<Parameters<typeof ReadingComplete>[0]> = {}) {
  const fullProps = { saveToDiary: true, exportData: EXPORT_DATA, onNewEntry: vi.fn(), ...props };
  const Stub = createRoutesStub([
    { path: "/reading", Component: () => <ReadingComplete {...fullProps} /> },
    { path: "/home", Component: () => <p>Home page</p> },
  ]);
  return render(
    <LoadingProvider>
      <Stub initialEntries={["/reading"]} />
    </LoadingProvider>,
  );
}

describe("ReadingComplete", () => {
  beforeEach(() => {
    vi.mocked(spreadExportAPI.exportSpreadPdf).mockResolvedValue(new Blob(["%PDF"], { type: "application/pdf" }));
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  it("shows the saved-entry message when saveToDiary is true", () => {
    renderReadingComplete({ saveToDiary: true });
    expect(
      screen.getByText("Take a deep breath. Your words are recorded; your heart never forgets."),
    ).toBeInTheDocument();
  });

  it("shows the free-reading message when saveToDiary is false", () => {
    renderReadingComplete({ saveToDiary: false });
    expect(screen.getByText("Inhale, then exhale. Let it go.")).toBeInTheDocument();
  });

  it("calls onNewEntry after a delay, giving the logo time to fly back first", async () => {
    const onNewEntry = vi.fn();
    const user = userEvent.setup();
    renderReadingComplete({ onNewEntry });

    await user.click(screen.getByRole("button", { name: "New entry" }));

    expect(onNewEntry).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(onNewEntry).toHaveBeenCalledTimes(1));
  });

  it("delays a bottom-nav-style navigation until the logo has time to fly back", async () => {
    const user = userEvent.setup();
    const Stub = createRoutesStub([
      {
        path: "/reading",
        Component: () => (
          <>
            <ReadingComplete saveToDiary={true} exportData={EXPORT_DATA} onNewEntry={vi.fn()} />
            <Link to="/home">Home</Link>
          </>
        ),
      },
      { path: "/home", Component: () => <p>Home page</p> },
    ]);
    render(
      <LoadingProvider>
        <Stub initialEntries={["/reading"]} />
      </LoadingProvider>,
    );

    await user.click(screen.getByRole("link", { name: "Home" }));

    expect(screen.queryByText("Home page")).not.toBeInTheDocument();
    await vi.waitFor(() => expect(screen.getByText("Home page")).toBeInTheDocument());
  });

  it("downloads the full spread (incl. reflection) as a PDF", async () => {
    const user = userEvent.setup();
    renderReadingComplete();

    await user.click(screen.getByRole("button", { name: "CLAUDE Download PDF" }));

    await vi.waitFor(() =>
      expect(spreadExportAPI.exportSpreadPdf).toHaveBeenCalledWith(
        expect.objectContaining({ entry_text: "A quiet reading.", prompts: EXPORT_DATA.prompts }),
      ),
    );
  });

  it("falls back to a plain download when the browser can't share files", async () => {
    const user = userEvent.setup();
    renderReadingComplete();

    await user.click(screen.getByRole("button", { name: "CLAUDE Share" }));

    await vi.waitFor(() =>
      expect(spreadExportAPI.exportSpreadPdf).toHaveBeenCalledWith(
        expect.objectContaining({ entry_text: "", prompts: [] }),
      ),
    );
    expect(await screen.findByText("CLAUDE Sharing isn't supported here - downloaded instead")).toBeInTheDocument();
  });
});
