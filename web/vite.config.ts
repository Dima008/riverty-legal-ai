import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The browser talks to /api; the dev server forwards it to the FastAPI backend. Default port
// 8010 (8000 is taken by another app on the demo laptop); API_URL overrides it.
const apiUrl = process.env.API_URL ?? "http://127.0.0.1:8010";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // the presentation imports texts from docs/ (e.g. the task, verbatim), one level above web/
    fs: { allow: [".."] },
    proxy: {
      "/api": {
        target: apiUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
