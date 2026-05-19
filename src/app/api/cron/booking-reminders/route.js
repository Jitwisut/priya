import {
  getBookingsDueForEmailReminder,
  markBookingReminderEmailChecked,
  markBookingReminderEmailFailed,
  markBookingReminderEmailSent,
} from "@/lib/booking-store";
import { sendBookingReminderEmail } from "@/lib/booking-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

function getSafeErrorMessage(error) {
  if (!(error instanceof Error) || !error.message) {
    return "Unknown reminder email error.";
  }

  return error.message
    .replaceAll(process.env.SMTP_PASS || "", "[redacted]")
    .replaceAll(process.env.SMTP_USER || "", "[redacted]");
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const dueBookings = await getBookingsDueForEmailReminder();
  const results = [];

  for (const booking of dueBookings) {
    try {
      await markBookingReminderEmailChecked(booking.id);
      const result = await sendBookingReminderEmail(booking);

      if (result.skipped) {
        await markBookingReminderEmailFailed(
          booking.id,
          "SMTP is not configured. Reminder email was skipped.",
        );
        results.push({ bookingId: booking.id, status: "skipped" });
        continue;
      }

      await markBookingReminderEmailSent(booking.id);
      results.push({ bookingId: booking.id, status: "sent" });
    } catch (error) {
      const message = getSafeErrorMessage(error);
      await markBookingReminderEmailFailed(booking.id, message);
      results.push({ bookingId: booking.id, status: "failed", error: message });
    }
  }

  return Response.json({
    checkedAt: new Date().toISOString(),
    dueCount: dueBookings.length,
    results,
  });
}
