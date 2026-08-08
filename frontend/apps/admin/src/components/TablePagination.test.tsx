// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TablePagination from "./TablePagination";

describe("TablePagination", () => {
  it("calls onPageChange with the next page when Next is clicked", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<TablePagination page={2} totalPages={5} loading={false} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: /go to next page/i }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange with the previous page when Previous is clicked", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<TablePagination page={2} totalPages={5} loading={false} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: /go to previous page/i }));

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("clamps to page 1 when Previous is clicked on the first page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<TablePagination page={1} totalPages={5} loading={false} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: /go to previous page/i }));

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("clamps to totalPages when Next is clicked on the last page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<TablePagination page={5} totalPages={5} loading={false} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: /go to next page/i }));

    expect(onPageChange).toHaveBeenCalledWith(5);
  });

  it("marks Previous as disabled on the first page and Next as enabled", () => {
    render(<TablePagination page={1} totalPages={5} loading={false} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /go to previous page/i }).getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("button", { name: /go to next page/i }).getAttribute("aria-disabled")).toBe("false");
  });

  it("marks Next as disabled on the last page and Previous as enabled", () => {
    render(<TablePagination page={5} totalPages={5} loading={false} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /go to next page/i }).getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("button", { name: /go to previous page/i }).getAttribute("aria-disabled")).toBe("false");
  });

  it("marks both Previous and Next as disabled while loading", () => {
    render(<TablePagination page={2} totalPages={5} loading={true} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /go to previous page/i }).getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("button", { name: /go to next page/i }).getAttribute("aria-disabled")).toBe("true");
  });

  it("shows the current page and total page count", () => {
    render(<TablePagination page={3} totalPages={7} loading={false} onPageChange={vi.fn()} />);

    expect(screen.getByText("Page 3 of 7")).toBeInTheDocument();
  });
});
