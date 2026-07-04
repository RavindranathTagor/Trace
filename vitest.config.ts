import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Resolve the `@/*` path alias (matches tsconfig) so tests can import lib modules.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    // Only our own tests — never the bundled tests inside any node_modules
    // (root or nested under adapters/).
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**"],
  },
});
