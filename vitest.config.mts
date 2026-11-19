import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@data": fileURLToPath(new URL("./data/generated", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: { include: ["tests/unit/**/*.test.ts"], env: { NEXT_PUBLIC_USE_MOCK: "true" } },
});
