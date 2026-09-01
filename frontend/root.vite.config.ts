import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

export function createViteConfig(port: number, { open = true }: { open?: boolean } = {}) {
  return defineConfig({
    plugins: [
      react(),
      tailwindcss(),
      babel({ presets: [reactCompilerPreset()] }),
      visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      port,
      strictPort: false,
      open,
      proxy: {
        "/api/v1": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
        "/static": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
    build: {
      target: "esnext",
      minify: "terser",
      sourcemap: false,
    },
    define: {
      __VERSION__: JSON.stringify(process.env.npm_package_version),
    },
  });
}
