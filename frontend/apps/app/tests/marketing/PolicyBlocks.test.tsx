// SPDX-License-Identifier: AGPL-3.0-or-later
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { linkify } from "../../src/marketing/PolicyBlocks";

function renderLinkified(text: string) {
  return render(<MemoryRouter>{linkify(text, "test")}</MemoryRouter>);
}

describe("linkify", () => {
  it("leaves plain text alone", () => {
    expect(linkify("no links here", "test")).toBe("no links here");
  });

  it("turns [text](/path) into an in-app link", () => {
    renderLinkified("See our [Privacy Policy](/privacy-policy).");

    const link = screen.getByRole("link", { name: "Privacy Policy" });
    expect(link).toHaveAttribute("href", "/privacy-policy");
    expect(link).not.toHaveAttribute("target");
  });

  it("opens [text](https://...) and bare URLs in a new tab", () => {
    renderLinkified("Code [on GitHub](https://github.com/example) or https://example.com/page.");

    expect(screen.getByRole("link", { name: "on GitHub" })).toHaveAttribute("href", "https://github.com/example");
    const bare = screen.getByRole("link", { name: "https://example.com/page" });
    expect(bare).toHaveAttribute("target", "_blank");
    expect(bare).toHaveAttribute("rel", "noreferrer");
  });

  it("turns an email into a mailto link, excluding surrounding punctuation", () => {
    renderLinkified("Email us (hello@example.com).");

    expect(screen.getByRole("link", { name: "hello@example.com" })).toHaveAttribute("href", "mailto:hello@example.com");
  });
});
