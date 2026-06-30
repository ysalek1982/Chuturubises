// @lovable.dev/vite-tanstack-config already includes the following; do not add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro,
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // The project was exported from Lovable with a Cloudflare fallback.
  // For local/Vercel ownership we pin Nitro to Vercel's runtime output.
  nitro: {
    preset: "vercel",
    vercel: {
      functions: {
        runtime: "nodejs22.x",
      },
    },
  } as never,
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
