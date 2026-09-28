import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
      // vinext resolves next/* to its shims during builds; tests run without its plugin.
      { find: /^next\/(.*)$/, replacement: "vinext/shims/$1" },
      {
        find: "cloudflare:workers",
        replacement: fileURLToPath(new URL("./tests/cloudflare-workers.ts", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
