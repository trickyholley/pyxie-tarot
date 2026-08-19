// SPDX-License-Identifier: AGPL-3.0-or-later
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n.ts";
import Router from "./Router.tsx";
import "@pyxie/ui/styles/globals.css";
import "./theme.css";
// Weights matched to actual usage (font-normal/font-medium/font-semibold, plus the few
// text-muted-foreground italic prompts) - add more here if a new weight/style is used.
import "@fontsource/spectral/400.css";
import "@fontsource/spectral/400-italic.css";
import "@fontsource/spectral/500.css";
import "@fontsource/spectral/600.css";

// oxlint-disable-next-line typescript/no-non-null-assertion
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
);
