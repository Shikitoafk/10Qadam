import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const originValue =
    env.VITE_SITE_URL ||
    (env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "");
  let origin = null;
  if (originValue) {
    const parsed = new URL(originValue);
    if (!["https:", "http:"].includes(parsed.protocol))
      throw new Error("VITE_SITE_URL must be an http(s) URL.");
    origin = parsed.origin;
  }
  return {
    plugins: [
      {
        name: "spell-arena-search",
        transformIndexHtml() {
          return origin
            ? [
                {
                  tag: "link",
                  attrs: { rel: "canonical", href: `${origin}/` },
                  injectTo: "head",
                },
                {
                  tag: "meta",
                  attrs: { property: "og:url", content: `${origin}/` },
                  injectTo: "head",
                },
              ]
            : [];
        },
        generateBundle() {
          if (!origin) return;
          this.emitFile({
            type: "asset",
            fileName: "sitemap.xml",
            source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", "/arena", "/words", ...["A1", "A2", "B1", "B2", "C1"].map((level) => `/learn/${level}`)].map((path) => `<url><loc>${origin}${path}</loc></url>`).join("")}</urlset>\n`,
          });
        },
      },
    ],
  };
});
