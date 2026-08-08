import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    // apps/app's real changelog plugin shells out to git and only matters for the actual build;
    // tests that care about its content use `vi.mock("virtual:changelog", ...)`, so this just
    // needs to make the specifier structurally resolvable with an empty fallback.
    {
      name: "stub-virtual-changelog",
      resolveId(id) {
        if (id === "virtual:changelog") return "\0virtual:changelog";
      },
      load(id) {
        if (id === "\0virtual:changelog") return "export default [];";
      },
    },
  ],
  resolve: {
    tsconfigPaths: true,
  },
  // Mirrors root.vite.config.ts's `define` — apps/app's src references this build-time constant.
  define: {
    __VERSION__: JSON.stringify("test"),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["apps/*/src/**/*.test.{ts,tsx}", "packages/*/src/**/*.test.{ts,tsx}"],
  },
});
