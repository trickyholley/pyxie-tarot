import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

export function createViteConfig(port: number) {
  return defineConfig({
    plugins: [
      react(),
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
      open: true,
      proxy: {
        "/api/v1": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
    build: {
      target: "esnext",
      minify: "terser",
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              if (id.includes("react")) {
                return "react-vendor";
              }
              return "vendor";
            }
          },
        },
      },
    },
    define: {
      __VERSION__: JSON.stringify(process.env.npm_package_version),
    },
  });
}
