/**
 * One-off CLI to create a Paddle product + price in Paddle Sandbox and
 * record a matching (inactive) Plan row in our database.
 *
 * This never activates the plan -- that's a separate, deliberate business
 * decision made from /dashboard/admin/plans once the price is reviewed.
 *
 * Usage:
 *   npx tsx scripts/paddle-seed-plan.ts --key starter_monthly --name "Starter" \
 *     --amount 29.00 --currency USD --interval month [--trialDays 14]
 *
 * Reads PADDLE_API_KEY and PADDLE_ENV from apps/web/.env.local.
 */
import path from "node:path";
import { config } from "dotenv";
import { Paddle, Environment } from "@paddle/paddle-node-sdk";
import { prisma } from "@growthpilot/db";

config({ path: path.resolve(__dirname, "../../../apps/web/.env.local") });

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    const value = argv[i + 1];
    if (key && value !== undefined) args[key] = value;
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const key = args.key;
  const name = args.name;
  const interval = (args.interval ?? "month") as "month" | "year" | "one_time";
  const currency = args.currency ?? "USD";
  const amount = args.amount; // e.g. "29.00"
  const trialDays = args.trialDays ? Number(args.trialDays) : undefined;

  if (!key || !name || !amount) {
    console.error("Usage: --key <key> --name <name> --amount <amount> [--currency USD] [--interval month|year|one_time] [--trialDays N]");
    process.exit(1);
  }

  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    console.error("PADDLE_API_KEY is not set in apps/web/.env.local");
    process.exit(1);
  }

  const paddle = new Paddle(apiKey, {
    environment: process.env.PADDLE_ENV === "production" ? Environment.production : Environment.sandbox,
  });

  console.log(`Creating Paddle product "${name}"...`);
  const product = await paddle.products.create({ name, taxCategory: "standard" });
  console.log(`  product id: ${product.id}`);

  const unitPriceAmount = String(Math.round(Number(amount) * 100)); // lowest currency unit

  console.log(`Creating Paddle price (${amount} ${currency} / ${interval})...`);
  const price = await paddle.prices.create({
    productId: product.id,
    description: `${name} - ${interval}`,
    unitPrice: { amount: unitPriceAmount, currencyCode: currency as "USD" },
    billingCycle: interval === "one_time" ? null : { interval: interval === "year" ? "year" : "month", frequency: 1 },
    trialPeriod: trialDays ? { interval: "day", frequency: trialDays } : null,
  });
  console.log(`  price id: ${price.id}`);

  const plan = await prisma.plan.upsert({
    where: { key },
    create: {
      key,
      name,
      billingInterval: interval,
      amountMicros: BigInt(unitPriceAmount),
      currency,
      paddleProductId: product.id,
      paddlePriceId: price.id,
      trialDays,
      featureEntitlements: {},
      usageLimits: {},
      isActive: false,
    },
    update: {
      paddleProductId: product.id,
      paddlePriceId: price.id,
    },
  });

  console.log(`\nPlan "${plan.key}" saved (inactive). Activate it from /dashboard/admin/plans when ready.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
