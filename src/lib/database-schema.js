import "server-only";

import { Pool } from "pg";

let schemaReadyPromise;

async function runSchemaSetup() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const pool = new Pool({ connectionString });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Booking" (
        "id" TEXT PRIMARY KEY,
        "customerName" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "ritualKey" TEXT NOT NULL,
        "ritualLabel" TEXT NOT NULL,
        "durationMinutes" INTEGER NOT NULL,
        "amountMinor" INTEGER NOT NULL,
        "currency" TEXT NOT NULL,
        "preferredDate" TEXT NOT NULL,
        "preferredTime" TEXT NOT NULL,
        "language" TEXT NOT NULL,
        "bookingStatus" TEXT NOT NULL,
        "paymentStatus" TEXT NOT NULL,
        "stripeCheckoutSessionId" TEXT,
        "stripePaymentIntentId" TEXT,
        "checkoutUrl" TEXT,
        "paidAt" TEXT,
        "emailSentAt" TEXT,
        "reminderEmailSentAt" TEXT,
        "reminderEmailError" TEXT,
        "reminderLastCheckedAt" TEXT,
        "ownerNotificationSentAt" TEXT,
        "ownerNotificationError" TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL,
        "needsManualReview" BOOLEAN NOT NULL DEFAULT false,
        "adminNotes" TEXT,
        "idempotencyKey" TEXT NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "WebhookEvent" (
        "id" TEXT PRIMARY KEY,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      ALTER TABLE "Booking"
        ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT,
        ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT,
        ADD COLUMN IF NOT EXISTS "checkoutUrl" TEXT,
        ADD COLUMN IF NOT EXISTS "paidAt" TEXT,
        ADD COLUMN IF NOT EXISTS "emailSentAt" TEXT,
        ADD COLUMN IF NOT EXISTS "reminderEmailSentAt" TEXT,
        ADD COLUMN IF NOT EXISTS "reminderEmailError" TEXT,
        ADD COLUMN IF NOT EXISTS "reminderLastCheckedAt" TEXT,
        ADD COLUMN IF NOT EXISTS "ownerNotificationSentAt" TEXT,
        ADD COLUMN IF NOT EXISTS "ownerNotificationError" TEXT,
        ADD COLUMN IF NOT EXISTS "needsManualReview" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "adminNotes" TEXT,
        ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT NOT NULL DEFAULT '';
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS "Booking_slot_idx"
        ON "Booking" ("bookingStatus", "preferredDate", "preferredTime");
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS "Booking_idempotencyKey_idx"
        ON "Booking" ("idempotencyKey");
    `);
  } finally {
    await pool.end();
  }
}

export async function ensureDatabaseSchema() {
  schemaReadyPromise ??= runSchemaSetup().catch((error) => {
    schemaReadyPromise = undefined;
    throw error;
  });

  return schemaReadyPromise;
}
