# Email Setup

The booking system sends confirmation and reminder emails through SMTP.

## Gmail SMTP

1. Open your Google Account.
2. Turn on 2-Step Verification.
3. Go to App Passwords.
4. Create an app password for Mail.
5. Add these values to `.env.local`.

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=yourgmail@gmail.com
SMTP_PASS=your_16_character_google_app_password
SMTP_FROM=Priya Thai Massage <yourgmail@gmail.com>
```

Restart the Next.js dev server after changing `.env.local`.

## Appointment Reminders

Email reminders are sent by the Vercel cron route at `/api/cron/booking-reminders`.
The route checks confirmed, paid bookings and sends one reminder before the appointment.

Add these values locally and in Vercel Environment Variables:

```env
CRON_SECRET=replace_with_a_long_random_secret
REMINDER_HOURS_BEFORE=24
BUSINESS_TIME_ZONE=Europe/Ljubljana
```

`REMINDER_HOURS_BEFORE=24` means the reminder is sent when a confirmed paid booking is within the next 24 hours. The reminder includes a polite late-arrival policy:

> If you arrive more than 15 minutes late, your massage time may be shortened to fit the remaining appointment time. For a longer delay, the appointment may be treated as cancelled according to the booking policy, and the deposit or paid amount may be retained.

Vercel Cron runs from `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/booking-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

For local testing, start the dev server and call:

```powershell
$headers = @{ Authorization = "Bearer local_booking_reminder_secret_change_before_production" }
Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/cron/booking-reminders" -Headers $headers
```

## Notes

- `SMTP_PASS` is not your normal Gmail password. It must be a Google App Password.
- `.env.local` is ignored by git, so do not commit real credentials.
- If SMTP is not configured, reminder attempts are skipped and the booking stores the reminder error for review.
