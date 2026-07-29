import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: "@", replacement: path.resolve(__dirname, "./src") }],
  },
  server: {
    port: 5173,
    // Cloudflare Tunnel đổi subdomain *.trycloudflare.com mỗi lần chạy lại;
    // wildcard này tránh phải sửa file mỗi lần deploy lại (xem client/README.md).
    allowedHosts: [".trycloudflare.com"],
    // Đẩy mọi request /api/* sang backend Flask (server.py) => khỏi lo CORS,
    // và API key chỉ nằm ở server chứ không lọt xuống trình duyệt.
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
