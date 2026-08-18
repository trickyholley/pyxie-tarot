// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import { LoadingProvider } from "@pyxie/providers";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ContactForm from "../src/ContactForm";

vi.mock("@pyxie/api-client/src/api/contact.ts", () => ({
  sendContactMessage: vi.fn(),
}));

const { sendContactMessage } = await import("@pyxie/api-client/src/api/contact.ts");

function renderContactForm() {
  return render(
    <MemoryRouter>
      <LoadingProvider>
        <ContactForm />
      </LoadingProvider>
    </MemoryRouter>,
  );
}

describe("ContactForm", () => {
  it("submits a contact form", async () => {
    vi.mocked(sendContactMessage).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderContactForm();

    await user.type(screen.getByLabelText("Contact us"), "Hello, I have feedback.");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(sendContactMessage).toHaveBeenCalledWith("Hello, I have feedback.");
  });
});
