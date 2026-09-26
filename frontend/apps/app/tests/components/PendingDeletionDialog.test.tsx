// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { LoadingProvider, useAuth } from "@pyxie/providers";
import { makeTestUser, mockAuthValue } from "@pyxie/providers/src/testUtils.ts";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PendingDeletionDialog from "../../src/components/PendingDeletionDialog.tsx";

vi.mock("@pyxie/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/providers")>();
  return { ...actual, useAuth: vi.fn() };
});

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, userAPI: { cancelDeletion: vi.fn() } };
});

const { userAPI } = await import("@pyxie/api-client");

const HOUR_MS = 60 * 60 * 1000;

function scheduledIn(ms: number) {
  return makeTestUser({ deletion_scheduled_for: new Date(Date.now() + ms).toISOString() });
}

const pendingUser = scheduledIn(5.5 * HOUR_MS);

function renderDialog(user = pendingUser, logout = vi.fn(), updateUser = vi.fn()) {
  vi.mocked(useAuth).mockReturnValue(mockAuthValue({ user, logout, updateUser }));
  render(
    <LoadingProvider>
      <PendingDeletionDialog />
    </LoadingProvider>,
  );
  return { logout, updateUser };
}

describe("PendingDeletionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when no deletion is scheduled", () => {
    renderDialog(makeTestUser());

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each([
    [5.5 * HOUR_MS, /deleted in 5 hours/],
    [HOUR_MS + 60_000, /deleted in 1 hour\./],
    [30 * 60_000, /deleted in less than an hour/],
  ])("counts down in whole hours (%d ms left)", (msLeft, text) => {
    renderDialog(scheduledIn(msLeft));

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("cancels the deletion when keeping the account", async () => {
    const restored = makeTestUser();
    vi.mocked(userAPI.cancelDeletion).mockResolvedValue(restored);
    const { updateUser } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: /keep my account/i }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith(restored));
  });

  it("logs out without cancelling", async () => {
    const { logout } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: /log out/i }));

    expect(logout).toHaveBeenCalled();
    expect(userAPI.cancelDeletion).not.toHaveBeenCalled();
  });
});
