import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { ensureDatabaseSchema } from "./database-schema";
import prisma from "./prisma";

const pendingBookingReuseWindowMs = 30 * 60 * 1000;
const defaultReminderHoursBefore = 24;
const defaultBusinessTimeZone = "Europe/Ljubljana";

function buildFingerprint(input) {
  return createHash("sha256")
    .update(
      [
        input.email.toLowerCase(),
        input.name.toLowerCase(),
        input.phone,
        input.ritualKey,
        input.preferredDate,
        input.preferredTime,
      ].join("|"),
    )
    .digest("hex");
}

function isPendingReusable(booking) {
  if (booking.bookingStatus !== "pending_payment" || booking.paymentStatus !== "unpaid") {
    return false;
  }
  const createdAt = new Date(booking.createdAt).getTime();
  return Date.now() - createdAt <= pendingBookingReuseWindowMs;
}

function getReminderHoursBefore() {
  const value = Number(process.env.REMINDER_HOURS_BEFORE || defaultReminderHoursBefore);
  return Number.isFinite(value) && value > 0 ? value : defaultReminderHoursBefore;
}

function getBusinessTimeZone() {
  return process.env.BUSINESS_TIME_ZONE || defaultBusinessTimeZone;
}

function getTimeZoneParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function zonedAppointmentToDate(preferredDate, preferredTime) {
  const [year, month, day] = String(preferredDate).split("-").map(Number);
  const [hour, minute] = String(preferredTime).split(":").map(Number);

  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    return null;
  }

  const targetLocalUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utcMs = targetLocalUtc;
  const timeZone = getBusinessTimeZone();

  for (let index = 0; index < 3; index += 1) {
    const parts = getTimeZoneParts(new Date(utcMs), timeZone);
    const formattedLocalUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    utcMs -= formattedLocalUtc - targetLocalUtc;
  }

  return new Date(utcMs);
}

export async function createPendingBooking(input) {
  await ensureDatabaseSchema();

  const fingerprint = buildFingerprint(input);

  // Find existing reusable pending booking
  const existingBookings = await prisma.booking.findMany({
    where: { idempotencyKey: fingerprint },
  });
  
  const reusableBooking = existingBookings.find(isPendingReusable);

  if (reusableBooking) {
    return {
      booking: reusableBooking,
      reused: true,
    };
  }

  const booking = await prisma.booking.create({
    data: {
      id: `bk_${randomUUID().replaceAll("-", "")}`,
      customerName: input.name,
      phone: input.phone,
      email: input.email,
      ritualKey: input.ritualKey,
      ritualLabel: input.ritualLabel,
      durationMinutes: input.durationMinutes,
      amountMinor: input.amountMinor,
      currency: input.currency,
      preferredDate: input.preferredDate,
      preferredTime: input.preferredTime,
      language: input.language,
      bookingStatus: "pending_payment",
      paymentStatus: "unpaid",
      stripeCheckoutSessionId: "",
      stripePaymentIntentId: "",
      checkoutUrl: "",
      paidAt: "",
      emailSentAt: "",
      ownerNotificationSentAt: "",
      ownerNotificationError: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      needsManualReview: false,
      adminNotes: "",
      idempotencyKey: fingerprint,
    },
  });

  return {
    booking,
    reused: false,
  };
}

export async function updateBookingCheckoutSession(bookingId, details) {
  await ensureDatabaseSchema();

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return null;

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      stripeCheckoutSessionId: details.sessionId,
      stripePaymentIntentId: details.paymentIntentId || booking.stripePaymentIntentId,
      checkoutUrl: details.checkoutUrl || booking.checkoutUrl,
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function getBookingById(bookingId) {
  await ensureDatabaseSchema();

  return prisma.booking.findUnique({ where: { id: bookingId } });
}

export async function getBookingByCheckoutSessionId(sessionId) {
  await ensureDatabaseSchema();

  return prisma.booking.findFirst({
    where: { stripeCheckoutSessionId: sessionId },
  });
}

export async function hasConfirmedBookingAtSlot(date, time) {
  await ensureDatabaseSchema();

  const count = await prisma.booking.count({
    where: {
      bookingStatus: "confirmed",
      preferredDate: date,
      preferredTime: time,
    },
  });
  return count > 0;
}

export async function markBookingPaymentFailedBySessionId(sessionId, status = "payment_failed") {
  const booking = await getBookingByCheckoutSessionId(sessionId);
  if (!booking) return null;
  if (booking.paymentStatus === "paid") return booking;

  return prisma.booking.update({
    where: { id: booking.id },
    data: {
      bookingStatus: status,
      paymentStatus: status === "cancelled" ? "expired" : "failed",
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function markBookingExpiredBySessionId(sessionId) {
  const booking = await getBookingByCheckoutSessionId(sessionId);
  if (!booking || booking.paymentStatus === "paid") return booking || null;

  return prisma.booking.update({
    where: { id: booking.id },
    data: {
      bookingStatus: "cancelled",
      paymentStatus: "expired",
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function reconcilePaidBooking({
  eventId,
  checkoutSessionId,
  paymentIntentId,
  paidAt,
}) {
  await ensureDatabaseSchema();

  return prisma.$transaction(async (tx) => {
    // Check if event was already processed
    if (eventId) {
      const existingEvent = await tx.webhookEvent.findUnique({
        where: { id: eventId },
      });
      
      if (existingEvent) {
        const existingBooking = await tx.booking.findFirst({
          where: { stripeCheckoutSessionId: checkoutSessionId },
        });
        return {
          booking: existingBooking || null,
          alreadyProcessed: true,
          shouldSendEmail: false,
        };
      }
    }

    const booking = await tx.booking.findFirst({
      where: {
        OR: [
          { stripeCheckoutSessionId: checkoutSessionId },
          paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {},
        ].filter(condition => Object.keys(condition).length > 0)
      },
    });

    if (!booking) {
      if (eventId) {
        await tx.webhookEvent.create({ data: { id: eventId } });
      }
      return {
        booking: null,
        alreadyProcessed: false,
        shouldSendEmail: false,
      };
    }

    if (booking.paymentStatus === "paid" && booking.bookingStatus === "confirmed") {
      if (eventId) {
        await tx.webhookEvent.create({ data: { id: eventId } });
      }
      return {
        booking,
        alreadyProcessed: false,
        shouldSendEmail: false,
      };
    }

    // Check for slot conflict
    const slotConflictCount = await tx.booking.count({
      where: {
        id: { not: booking.id },
        bookingStatus: "confirmed",
        preferredDate: booking.preferredDate,
        preferredTime: booking.preferredTime,
      },
    });

    const hasConflict = slotConflictCount > 0;
    
    const updatedBooking = await tx.booking.update({
      where: { id: booking.id },
      data: {
        stripeCheckoutSessionId: checkoutSessionId || booking.stripeCheckoutSessionId,
        stripePaymentIntentId: paymentIntentId || booking.stripePaymentIntentId,
        paymentStatus: "paid",
        paidAt: paidAt || booking.paidAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bookingStatus: hasConflict ? "cancelled" : "confirmed",
        needsManualReview: hasConflict,
        adminNotes: hasConflict ? "Paid after slot conflict. Manual follow-up or refund required." : booking.adminNotes,
      },
    });

    if (eventId) {
      await tx.webhookEvent.create({ data: { id: eventId } });
    }

    return {
      booking: updatedBooking,
      alreadyProcessed: false,
      shouldSendEmail: updatedBooking.bookingStatus === "confirmed" && !updatedBooking.emailSentAt,
    };
  });
}

export async function markBookingConfirmationEmailSent(bookingId) {
  const booking = await getBookingById(bookingId);
  if (!booking) return null;

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      emailSentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function getBookingsDueForEmailReminder(now = new Date()) {
  await ensureDatabaseSchema();

  const leadTimeMs = getReminderHoursBefore() * 60 * 60 * 1000;
  const bookings = await prisma.booking.findMany({
    where: {
      bookingStatus: "confirmed",
      paymentStatus: "paid",
      reminderEmailSentAt: null,
    },
    orderBy: { preferredDate: "asc" },
  });

  return bookings.filter((booking) => {
    const appointmentAt = zonedAppointmentToDate(booking.preferredDate, booking.preferredTime);

    if (!appointmentAt) {
      return false;
    }

    const msUntilAppointment = appointmentAt.getTime() - now.getTime();
    return msUntilAppointment > 0 && msUntilAppointment <= leadTimeMs;
  });
}

export async function markBookingReminderEmailChecked(bookingId) {
  await ensureDatabaseSchema();

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      reminderLastCheckedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function markBookingReminderEmailSent(bookingId) {
  await ensureDatabaseSchema();

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      reminderEmailSentAt: new Date().toISOString(),
      reminderEmailError: "",
      reminderLastCheckedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function markBookingReminderEmailFailed(bookingId, errorMessage) {
  await ensureDatabaseSchema();

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      reminderEmailError: errorMessage,
      reminderLastCheckedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function markOwnerNotificationSent(bookingId) {
  const booking = await getBookingById(bookingId);
  if (!booking) return null;

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      ownerNotificationSentAt: new Date().toISOString(),
      ownerNotificationError: "",
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function markOwnerNotificationFailed(bookingId, errorMessage) {
  const booking = await getBookingById(bookingId);
  if (!booking) return null;

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      ownerNotificationError: errorMessage,
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function getAllBookings() {
  await ensureDatabaseSchema();

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return bookings;
}
