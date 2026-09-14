import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolves the `@/*` -> `src/*` alias from tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // The integration suite shares one Postgres database; running files in
    // parallel would let them clobber each other's rows.
    fileParallelism: false,
  },
});
