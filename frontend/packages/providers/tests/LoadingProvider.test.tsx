// SPDX-License-Identifier: AGPL-3.0-or-later
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoadingProvider from "../src/LoadingProvider";
import useLoading from "../src/useLoading";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function Harness({ pending }: { pending?: Promise<void> }) {
  const { isLoading, startLoading, stopLoading, pulseLoading, withLoading } = useLoading();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <button type="button" onClick={() => startLoading()}>
        start
      </button>
      <button type="button" onClick={() => stopLoading()}>
        stop
      </button>
      <button type="button" onClick={() => pulseLoading()}>
        pulse
      </button>
      {pending && (
        <button type="button" onClick={() => void withLoading(pending)}>
          withLoading
        </button>
      )}
    </div>
  );
}

describe("LoadingProvider", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to not loading", () => {
    render(
      <LoadingProvider>
        <Harness />
      </LoadingProvider>,
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("becomes loading after startLoading and stops after a matching stopLoading", async () => {
    const user = userEvent.setup();
    render(
      <LoadingProvider>
        <Harness />
      </LoadingProvider>,
    );

    await user.click(screen.getByRole("button", { name: "start" }));
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    await user.click(screen.getByRole("button", { name: "stop" }));
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"), { timeout: 2000 });
  });

  it("stays loading until every concurrent start has a matching stop", async () => {
    const user = userEvent.setup();
    render(
      <LoadingProvider>
        <Harness />
      </LoadingProvider>,
    );

    await user.click(screen.getByRole("button", { name: "start" }));
    await user.click(screen.getByRole("button", { name: "start" }));
    await user.click(screen.getByRole("button", { name: "stop" }));
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    await user.click(screen.getByRole("button", { name: "stop" }));
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"), { timeout: 2000 });
  });

  it("withLoading marks isLoading true while the promise is pending and false once it settles", async () => {
    const { promise, resolve } = deferred<void>();
    const user = userEvent.setup();
    render(
      <LoadingProvider>
        <Harness pending={promise} />
      </LoadingProvider>,
    );

    await user.click(screen.getByRole("button", { name: "withLoading" }));
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    resolve();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"), { timeout: 2000 });
  });

  it("keeps the loading state visible for a minimum duration even when stopped immediately", () => {
    vi.useFakeTimers();
    render(
      <LoadingProvider>
        <Harness />
      </LoadingProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "start" }));
    fireEvent.click(screen.getByRole("button", { name: "stop" }));
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    act(() => vi.advanceTimersByTime(999));
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("pulseLoading shows the minimum-duration loading state for an instantaneous action", () => {
    vi.useFakeTimers();
    render(
      <LoadingProvider>
        <Harness />
      </LoadingProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "pulse" }));
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    act(() => vi.advanceTimersByTime(999));
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });
});

describe("useLoading", () => {
  it("throws when used outside a LoadingProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Harness />)).toThrow("useLoading must be used within a LoadingProvider");

    spy.mockRestore();
  });
});
