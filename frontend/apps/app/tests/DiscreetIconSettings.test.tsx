// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { toast } from "@pyxie/ui";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DiscreetIconSettings from "../src/DiscreetIconSettings";

vi.mock("@/lib/discreetIcon.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/discreetIcon.ts")>();
  return { ...actual, getDiscreetIcon: vi.fn(), setDiscreetIcon: vi.fn() };
});

vi.mock("@pyxie/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/ui")>();
  return { ...actual, toast: { ...actual.toast, success: vi.fn(), error: vi.fn() } };
});

const { getDiscreetIcon, setDiscreetIcon } = await import("@/lib/discreetIcon.ts");

describe("DiscreetIconSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDiscreetIcon).mockResolvedValue(null);
  });

  it("shows the discreet icons only once the switch is turned on", async () => {
    vi.mocked(setDiscreetIcon).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<DiscreetIconSettings />);

    expect(screen.queryByRole("button", { name: /Calendar/ })).not.toBeInTheDocument();

    await user.click(await screen.findByRole("switch"));

    for (const name of [/Calendar/, /Contact/, /Focus/, /Map/, /Help/]) {
      expect(await screen.findByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("switches to the chosen icon", async () => {
    vi.mocked(setDiscreetIcon).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<DiscreetIconSettings />);

    await user.click(await screen.findByRole("switch"));
    await user.click(await screen.findByRole("button", { name: /Focus/ }));

    expect(setDiscreetIcon).toHaveBeenLastCalledWith("AppIconFocus");
  });

  it("shows an error toast when switching fails", async () => {
    vi.mocked(setDiscreetIcon).mockRejectedValue(new Error("native call failed"));
    const user = userEvent.setup();
    render(<DiscreetIconSettings />);

    await user.click(await screen.findByRole("switch"));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
