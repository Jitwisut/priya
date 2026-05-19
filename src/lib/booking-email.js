import "server-only";

import nodemailer from "nodemailer";
import { getDisplayBooking } from "@/lib/booking-presenters";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildEmailHtml(booking) {
  const safeBooking = Object.fromEntries(
    Object.entries(booking).map(([key, value]) => [key, escapeHtml(value)]),
  );

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1b1c1b">
      <h1 style="color:#735c00">Priya Thai Massage Booking Confirmed</h1>
      <p>Thank you for your payment. Your booking is now confirmed.</p>
      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse">
        <tr><td><strong>Booking reference</strong></td><td>${safeBooking.id}</td></tr>
        <tr><td><strong>Name</strong></td><td>${safeBooking.customerName}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${safeBooking.phone}</td></tr>
        <tr><td><strong>Email</strong></td><td>${safeBooking.email}</td></tr>
        <tr><td><strong>Ritual</strong></td><td>${safeBooking.ritualLabel}</td></tr>
        <tr><td><strong>Duration</strong></td><td>${safeBooking.durationMinutes} minutes</td></tr>
        <tr><td><strong>Amount paid</strong></td><td>${safeBooking.displayPrice}</td></tr>
        <tr><td><strong>Date</strong></td><td>${safeBooking.preferredDate}</td></tr>
        <tr><td><strong>Time</strong></td><td>${safeBooking.displayTime}</td></tr>
        <tr><td><strong>Status</strong></td><td>Confirmed</td></tr>
      </table>
      <p style="margin-top:24px">If you need to make a change, reply to this email or contact Priya Thai Massage directly.</p>
      <p>Priya Thai Massage<br/>Kolodvorska cesta 1, 1230 Domzale</p>
    </div>
  `;
}

function getReminderCopy(language = "en") {
  if (language === "sl") {
    return {
      subject: "Opomnik za vas termin pri Priya Thai Massage",
      title: "Nezen opomnik za vas termin",
      intro:
        "Hvala, ker ste izbrali Priya Thai Massage. Veselimo se, da vas kmalu sprejmemo v nasem salonu. Spodaj so podatki vase rezervacije.",
      arrival:
        "Prosimo, da prispete 5-10 minut pred dogovorjenim terminom, da se lahko v miru pripravite, sprostite in zacnete tretma brez naglice.",
      latePolicy:
        "V primeru zamude bomo z veseljem izvedli tretma v preostalem casu vasega termina. Ce zamuda preseze 15 minut, se lahko trajanje masaze ustrezno skrajsa. Pri daljsi zamudi ali neudelezbi se lahko termin obravnava kot odpoved v skladu s pogoji rezervacije, placani znesek oziroma ara pa se lahko zadrzi.",
      closing:
        "Ce morate termin prestaviti ali imate dodatna vprasanja, nas prosimo kontaktirajte cim prej. Hvala za razumevanje in se veselimo vasega obiska.",
      signature: "S toplimi pozdravi,\nPriya Thai Massage",
      heading: "Podrobnosti vasega termina",
      reference: "Referenca rezervacije",
      name: "Ime",
      phone: "Telefon",
      email: "Email",
      ritual: "Tretma",
      duration: "Trajanje",
      date: "Datum",
      time: "Ura",
      location: "Lokacija",
      note: "Opomba",
    };
  }

  return {
    subject: "Your Priya Thai Massage appointment reminder",
    title: "A gentle reminder for your appointment",
    intro:
      "Thank you for choosing Priya Thai Massage. We look forward to welcoming you to the sanctuary soon. Your booking details are below.",
    arrival:
      "Please arrive 5-10 minutes before your appointment so you have time to settle in, relax, and begin your treatment without feeling rushed.",
    latePolicy:
      "If you arrive late, we will still do our best to provide your treatment within the remaining appointment time. If you arrive more than 15 minutes late, your massage time may be shortened accordingly. For a longer delay or no-show, the appointment may be treated as cancelled according to the booking policy, and the deposit or paid amount may be retained.",
    closing:
      "If you need to reschedule or have any questions, please contact us as soon as possible. Thank you for your understanding, and we look forward to seeing you.",
    signature: "Warm regards,\nPriya Thai Massage",
    heading: "Your appointment details",
    reference: "Booking reference",
    name: "Name",
    phone: "Phone",
    email: "Email",
    ritual: "Ritual",
    duration: "Duration",
    date: "Date",
    time: "Time",
    location: "Location",
    note: "Please note",
  };
}

function buildReminderEmailHtml(booking) {
  const safeBooking = Object.fromEntries(
    Object.entries(booking).map(([key, value]) => [key, escapeHtml(value)]),
  );
  const copy = getReminderCopy(booking.language);

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1b1c1b">
      <h1 style="color:#735c00">${copy.title}</h1>
      <p>${copy.intro}</p>
      <h2 style="color:#735c00;font-size:20px">${copy.heading}</h2>
      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse">
        <tr><td><strong>${copy.reference}</strong></td><td>${safeBooking.id}</td></tr>
        <tr><td><strong>${copy.name}</strong></td><td>${safeBooking.customerName}</td></tr>
        <tr><td><strong>${copy.phone}</strong></td><td>${safeBooking.phone}</td></tr>
        <tr><td><strong>${copy.email}</strong></td><td>${safeBooking.email}</td></tr>
        <tr><td><strong>${copy.ritual}</strong></td><td>${safeBooking.ritualLabel}</td></tr>
        <tr><td><strong>${copy.duration}</strong></td><td>${safeBooking.durationMinutes} minutes</td></tr>
        <tr><td><strong>${copy.date}</strong></td><td>${safeBooking.preferredDate}</td></tr>
        <tr><td><strong>${copy.time}</strong></td><td>${safeBooking.displayTime}</td></tr>
        <tr><td><strong>${copy.location}</strong></td><td>Kolodvorska cesta 1, 1230 Domzale</td></tr>
      </table>
      <p style="margin-top:24px">${copy.arrival}</p>
      <p style="margin:18px 0 6px 0"><strong>${copy.note}</strong></p>
      <p style="padding:14px 16px;border-left:4px solid #d4af37;background:#fcf9f8">${copy.latePolicy}</p>
      <p>${copy.closing}</p>
      <p style="white-space:pre-line">${copy.signature}</p>
    </div>
  `;
}

function getTransporterConfig() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    return null;
  }

  return {
    smtpFrom,
    transporter: nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    }),
  };
}

export async function sendBookingConfirmationEmail(booking) {
  const config = getTransporterConfig();

  if (!config) {
    return { emailSent: false, skipped: true };
  }

  await config.transporter.sendMail({
    from: config.smtpFrom,
    to: booking.email,
    replyTo: config.smtpFrom,
    subject: "Priya Thai Massage booking confirmed",
    html: buildEmailHtml(getDisplayBooking(booking)),
  });

  return { emailSent: true };
}

export async function sendBookingReminderEmail(booking) {
  const config = getTransporterConfig();
  const displayBooking = getDisplayBooking(booking);
  const copy = getReminderCopy(displayBooking.language);

  if (!config) {
    return { emailSent: false, skipped: true };
  }

  await config.transporter.sendMail({
    from: config.smtpFrom,
    to: displayBooking.email,
    replyTo: config.smtpFrom,
    subject: copy.subject,
    html: buildReminderEmailHtml(displayBooking),
  });

  return { emailSent: true };
}
