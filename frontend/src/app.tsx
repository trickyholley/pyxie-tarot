import Router from "@routers/index.tsx";
import {StrictMode} from "react";
import "./index.css";
import {createRoot} from "react-dom/client";

// oxlint-disable-next-line typescript/no-non-null-assertion
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
);
