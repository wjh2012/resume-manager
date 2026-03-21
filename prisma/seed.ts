import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const MODEL_PRICING_SEED = [
  { provider: "openai", model: "gpt-4o", inputPricePerM: 2.5, outputPricePerM: 10.0 },
  { provider: "openai", model: "gpt-4o-mini", inputPricePerM: 0.15, outputPricePerM: 0.6 },
  { provider: "openai", model: "text-embedding-3-small", inputPricePerM: 0.02, outputPricePerM: 0 },
  { provider: "anthropic", model: "claude-sonnet-4-20250514", inputPricePerM: 3.0, outputPricePerM: 15.0 },
  { provider: "anthropic", model: "claude-haiku-4-5-20251001", inputPricePerM: 0.8, outputPricePerM: 4.0 },
  { provider: "google", model: "gemini-2.0-flash", inputPricePerM: 0.1, outputPricePerM: 0.4 },
  { provider: "google", model: "gemini-2.5-pro", inputPricePerM: 1.25, outputPricePerM: 10.0 },
]

async function main() {
  console.log("Seeding ModelPricing...")

  for (const pricing of MODEL_PRICING_SEED) {
    await prisma.modelPricing.upsert({
      where: {
        provider_model_effectiveFrom: {
          provider: pricing.provider,
          model: pricing.model,
          effectiveFrom: new Date("2025-01-01"),
        },
      },
      update: {
        inputPricePerM: pricing.inputPricePerM,
        outputPricePerM: pricing.outputPricePerM,
      },
      create: {
        ...pricing,
        effectiveFrom: new Date("2025-01-01"),
      },
    })
  }

  console.log("Seeding complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
