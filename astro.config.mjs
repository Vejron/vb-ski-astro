
import vue from "@astrojs/vue";
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: "https://skidveteraner.netlify.app/",
  sitemap: true, // Generate sitemap (set to "false" to disable)
  integrations: [vue(), tailwind()]
});