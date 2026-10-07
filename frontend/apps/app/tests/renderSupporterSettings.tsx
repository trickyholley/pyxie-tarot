// SPDX-License-Identifier: AGPL-3.0-or-later
import "@/i18n";
import type { User } from "@pyxie/api-client";
import type { ComponentProps } from "react";
import { LoadingProvider, useAuth } from "@pyxie/providers";
import { makeTestUser, mockAuthValue } from "@pyxie/providers/src/testUtils.ts";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { BillingReturnProvider } from "@/lib/BillingReturnContext";
import { type HeaderConfig, HeaderContext } from "@/lib/header.tsx";
import SupporterSettings from "../src/SupporterSettings";

export function renderSettings(
  userOverrides: Partial<User>,
  initialEntries: ComponentProps<typeof MemoryRouter>["initialEntries"] = ["/settings/supporter"],
) {
  vi.mocked(useAuth).mockReturnValue(mockAuthValue({ user: makeTestUser(userOverrides) }));
  const headers: (HeaderConfig | null)[] = [];
  const utils = render(
    <MemoryRouter initialEntries={initialEntries}>
      <HeaderContext.Provider value={(config) => headers.push(config)}>
        <LoadingProvider>
          <BillingReturnProvider>
            <SupporterSettings />
          </BillingReturnProvider>
        </LoadingProvider>
      </HeaderContext.Provider>
    </MemoryRouter>,
  );
  return { ...utils, lastHeader: () => headers[headers.length - 1] ?? null };
}
