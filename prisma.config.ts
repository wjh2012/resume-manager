import path from "node:path"
import dotenv from "dotenv"
import { defineConfig } from "prisma/config"

dotenv.config({ path: ".env.local" })

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL || undefined,
  },
})
