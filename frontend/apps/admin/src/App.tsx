import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Router from "./Router.tsx";
import "@pyxie/ui/styles/globals.css";

// oxlint-disable-next-line typescript/no-non-null-assertion
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
);
