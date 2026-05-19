ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "reminderEmailSentAt" TEXT,
  ADD COLUMN IF NOT EXISTS "reminderEmailError" TEXT,
  ADD COLUMN IF NOT EXISTS "reminderLastCheckedAt" TEXT;
