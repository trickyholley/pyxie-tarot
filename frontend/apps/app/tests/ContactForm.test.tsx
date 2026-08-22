// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { contactAPI } from "@pyxie/api-client";
import { AuthProvider, LoadingProvider } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ContactForm from "../src/ContactForm";

vi.mock("@pyxie/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pyxie/api-client")>();
  return { ...actual, contactAPI: { ...actual.contactAPI, sendContactMessage: vi.fn() } };
});

function renderContactForm() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoadingProvider>
          <ContactForm />
        </LoadingProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("ContactForm", () => {
  it("submits a contact form", async () => {
    vi.mocked(contactAPI.sendContactMessage).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderContactForm();

    await user.type(screen.getByLabelText(/your email/i), "visitor@example.com");
    await user.type(screen.getByLabelText("Contact us"), "Hello, I have feedback.");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(contactAPI.sendContactMessage).toHaveBeenCalledWith("visitor@example.com", "Hello, I have feedback.");
  });
});
