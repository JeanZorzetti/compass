import type { MetadataRoute } from "next";

export const SITE_URL = "https://compass.polarisia.com.br";

// ponytail: /dashboard, /admin e /login exigem sessão; /dl serve binário. Só marketing entra.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: SITE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/pricing`, lastModified, changeFrequency: "monthly", priority: 0.8 },
  ];
}
