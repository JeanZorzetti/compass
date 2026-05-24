import { defineConfig } from "prisma/config";

// Em dev local, carrega .env via dotenv (se disponível).
// Em produção (container), DATABASE_URL já está no env nativo — não precisa.
if (!process.env.DATABASE_URL) {
  try {
    // import dinâmico tolerante: não quebra se dotenv não estiver presente
    require("dotenv/config");
  } catch {
    // sem dotenv — assume env nativo
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
