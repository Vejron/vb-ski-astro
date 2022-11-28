import vue from "@astrojs/vue";
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://skidveteraner.se/",
  // Generate sitemap (set to "false" to disable)
  integrations: [
    vue(),
    tailwind(),
    sitemap({
      filter: (page) => page !== "https://skidveteraner.se/admin/",
    }),
  ],
});
