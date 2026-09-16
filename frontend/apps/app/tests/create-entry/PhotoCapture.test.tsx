// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { Camera } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { LoadingProvider } from "@pyxie/providers";
import { toast } from "@pyxie/ui";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PhotoCapture from "../../src/create-entry/PhotoCapture";

vi.mock("@capacitor/camera", () => ({ Camera: { takePhoto: vi.fn(), chooseFromGallery: vi.fn() } }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: vi.fn() } }));
vi.mock("@pyxie/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/ui")>();
  return { ...actual, toast: { ...actual.toast, error: vi.fn() } };
});

function renderCapture(onCaptured = vi.fn(), onCancel = vi.fn()) {
  render(
    <LoadingProvider>
      <PhotoCapture onCaptured={onCaptured} onCancel={onCancel} />
    </LoadingProvider>,
  );
  return { onCaptured, onCancel };
}

function mockFetchBlob(blob: Blob) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ blob: () => Promise.resolve(blob) } as never));
}

function mockImageBitmap(width = 100, height = 100) {
  const createImageBitmap = vi.fn().mockResolvedValue({ width, height, close: vi.fn() });
  vi.stubGlobal("createImageBitmap", createImageBitmap);
  return createImageBitmap;
}

// Exercises compress()'s real resize path rather than its no-context fallback - jsdom's getContext
// returns null without the optional `canvas` package installed, which compress() treats as "give up
// and return the original blob," bypassing the code this test exists to cover.
function mockCanvasToBlob(resultBlob: Blob) {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as never);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(resultBlob));
}

describe("PhotoCapture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows the take-photo option only on a native platform", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    renderCapture();

    expect(screen.queryByText("Take photo")).not.toBeInTheDocument();
    expect(screen.getByText("Choose from library")).toBeInTheDocument();
  });

  it("captures, compresses (with EXIF orientation applied), and hands up a camera photo", async () => {
    const user = userEvent.setup();
    const sourceBlob = new Blob(["source"], { type: "image/jpeg" });
    const resizedBlob = new Blob(["resized"], { type: "image/jpeg" });
    vi.mocked(Camera.takePhoto).mockResolvedValue({ webPath: "blob:camera-photo" } as never);
    mockFetchBlob(sourceBlob);
    const createImageBitmap = mockImageBitmap();
    mockCanvasToBlob(resizedBlob);
    const { onCaptured } = renderCapture();

    await user.click(screen.getByText("Take photo"));

    await waitFor(() => expect(onCaptured).toHaveBeenCalledWith(resizedBlob));
    expect(createImageBitmap).toHaveBeenCalledWith(sourceBlob, { imageOrientation: "from-image" });
  });

  it("picks the first gallery result and hands up the compressed photo", async () => {
    const user = userEvent.setup();
    const sourceBlob = new Blob(["source"], { type: "image/jpeg" });
    const resizedBlob = new Blob(["resized"], { type: "image/jpeg" });
    vi.mocked(Camera.chooseFromGallery).mockResolvedValue({ results: [{ webPath: "blob:gallery-photo" }] } as never);
    mockFetchBlob(sourceBlob);
    mockImageBitmap();
    mockCanvasToBlob(resizedBlob);
    const { onCaptured } = renderCapture();

    await user.click(screen.getByText("Choose from library"));

    await waitFor(() => expect(onCaptured).toHaveBeenCalledWith(resizedBlob));
  });

  it("silently does nothing when the native picker is cancelled", async () => {
    const user = userEvent.setup();
    vi.mocked(Camera.takePhoto).mockRejectedValue(new Error("User cancelled photos app"));
    const { onCaptured } = renderCapture();

    await user.click(screen.getByText("Take photo"));

    await waitFor(() => expect(Camera.takePhoto).toHaveBeenCalled());
    expect(onCaptured).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows an error toast for a real capture failure, distinct from a cancel", async () => {
    const user = userEvent.setup();
    vi.mocked(Camera.takePhoto).mockRejectedValue(new Error("Camera unavailable"));
    const { onCaptured } = renderCapture();

    await user.click(screen.getByText("Take photo"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't get that photo - try again"));
    expect(onCaptured).not.toHaveBeenCalled();
  });

  it("shows an error toast when the result has no webPath", async () => {
    const user = userEvent.setup();
    vi.mocked(Camera.takePhoto).mockResolvedValue({} as never);
    const { onCaptured } = renderCapture();

    await user.click(screen.getByText("Take photo"));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onCaptured).not.toHaveBeenCalled();
  });

  it("calls onCancel when the back button is clicked", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderCapture();

    await user.click(screen.getByText("Back"));

    expect(onCancel).toHaveBeenCalled();
  });
});
