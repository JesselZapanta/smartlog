import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

function enforceEnv() {
  return {
    name: "enforce-env",
    configResolved(config) {
      const missing = ["VITE_API_URL"].filter((key) => !config.env[key]);
      if (missing.length > 0) {
        throw new Error(
          `Build failed: missing environment variable(s): ${missing.join(", ")}. ` +
            "Set them in .env.production or the Vercel project env vars."
        );
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), enforceEnv()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
