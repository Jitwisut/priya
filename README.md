# Priya Thai Massage

เว็บไซต์ Next.js สำหรับร้าน Priya Thai Massage มีหน้าเว็บหลายภาษา ระบบจองคอร์สนวด ระบบจ่ายเงินผ่าน Stripe ระบบเก็บข้อมูล booking ด้วย PostgreSQL/Prisma หน้า owner dashboard ระบบส่งอีเมลยืนยันการจอง และระบบส่งอีเมลแจ้งเตือนก่อนถึงเวลานัด

## ฟีเจอร์หลัก

- หน้า Home, Rituals, Academy, Experience และ Book
- รองรับภาษาอังกฤษและสโลวีเนีย
- หน้า detail ของแต่ละคอร์ส เช่น Traditional Thai, Thai Oil, Deep Tissue, Hot Stone
- กดจองจากหน้าคอร์สแล้วพาไปหน้า booking พร้อมเลือกคอร์สนั้นให้
- ระบบจ่ายเงินผ่าน Stripe Checkout
- เก็บ booking ใน PostgreSQL ผ่าน Prisma
- หน้า owner dashboard ที่ `/owner/dashboard`
- ส่งอีเมลยืนยันหลังชำระเงินสำเร็จ
- ส่งอีเมล reminder ก่อนถึงเวลานัด
- ข้อความแจ้งนโยบายการมาสายแบบสุภาพใน reminder email
- เมนู mobile hamburger

## วิธีรันบนเครื่อง

ติดตั้ง dependencies:

```bash
npm install
```

สร้างไฟล์ `.env.local` จาก `.env.example`

เปิดฐานข้อมูล PostgreSQL ด้วย Docker:

```bash
npm run db:up
npm run db:migrate
```

รันเว็บ:

```bash
npm run dev
```

เปิดเว็บ:

```text
http://localhost:3000
```

## ฐานข้อมูล Local

โปรเจกต์นี้ใช้ PostgreSQL ผ่าน Docker Compose

ค่า default:

```env
POSTGRES_USER=admin
POSTGRES_PASSWORD=adminpassword
POSTGRES_DB=priya_db
POSTGRES_PORT=55432
DATABASE_URL=postgresql://admin:adminpassword@127.0.0.1:55432/priya_db
DIRECT_URL=postgresql://admin:adminpassword@127.0.0.1:55432/priya_db
```

คำสั่งที่ใช้บ่อย:

```bash
npm run db:up
npm run db:migrate
npm run db:studio
npm run db:logs
npm run db:down
```

ข้อมูล local จะอยู่ใน Docker volume ชื่อ `priya_postgres_data` ดังนั้นปิด/เปิด container แล้วข้อมูลยังอยู่

## Environment Variables

ใช้ `.env.local` สำหรับเครื่อง local และตั้งค่าเหล่านี้ใน Vercel ตอน deploy จริง

ฐานข้อมูล:

```env
POSTGRES_USER=admin
POSTGRES_PASSWORD=adminpassword
POSTGRES_DB=priya_db
POSTGRES_PORT=55432
DATABASE_URL=postgresql://admin:adminpassword@127.0.0.1:55432/priya_db
DIRECT_URL=postgresql://admin:adminpassword@127.0.0.1:55432/priya_db
```

ตัวแอป:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=replace_with_a_long_random_secret
OWNER_USERNAME=admin
OWNER_PASSWORD=change_me
```

Stripe:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

อีเมลผ่าน SMTP:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=yourgmail@gmail.com
SMTP_PASS=your_16_character_google_app_password
SMTP_FROM=Priya Thai Massage <yourgmail@gmail.com>
```

หมายเหตุ: `SMTP_PASS` ต้องเป็น Google App Password ไม่ใช่รหัสผ่าน Gmail ปกติ

Email reminder cron:

```env
CRON_SECRET=replace_with_a_long_random_secret
REMINDER_HOURS_BEFORE=24
BUSINESS_TIME_ZONE=Europe/Ljubljana
```

WhatsApp owner notification หลังจ่ายเงินสำเร็จ ถ้าจะใช้:

```env
WHATSAPP_ACCESS_TOKEN=your_meta_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
WHATSAPP_OWNER_PHONE=66801234567
```

## Flow การจอง

1. ลูกค้าเข้า `/book`
2. ลูกค้าเลือกคอร์ส ระยะเวลา วันที่ เวลา และกรอกข้อมูลติดต่อ
3. ระบบสร้าง booking แบบ pending ใน PostgreSQL
4. ระบบสร้าง Stripe Checkout session
5. ลูกค้าจ่ายเงินบน Stripe Checkout
6. Stripe webhook ยิงกลับมาที่ระบบ
7. ระบบเปลี่ยน booking เป็น confirmed/paid
8. ระบบส่งอีเมลยืนยันให้ลูกค้า
9. หน้า owner dashboard แสดง booking ใหม่
10. Cron ส่ง reminder email ก่อนถึงเวลานัด

Reminder email จะส่งเฉพาะ booking ที่มีสถานะ:

```text
bookingStatus = confirmed
paymentStatus = paid
reminderEmailSentAt = null
เวลานัดอยู่ภายใน REMINDER_HOURS_BEFORE
```

## Owner Dashboard

หน้า login:

```text
http://localhost:3000/owner/login
```

ตั้งค่า user owner ผ่าน env:

```env
OWNER_USERNAME=admin
OWNER_PASSWORD=change_me
JWT_SECRET=replace_with_a_long_random_secret
```

ข้อมูล local ตอนนี้:

```text
Username: admin
Password: 123456
```

ก่อนใช้งานจริงต้องเปลี่ยน `OWNER_PASSWORD` และ `JWT_SECRET`

## Stripe Webhook

ทดสอบ Stripe webhook บน local ด้วย Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

นำ webhook secret ไปใส่:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

ถ้าใช้ Stripe Checkout ระบบ Apple Pay และ Google Pay จะขึ้นเองเมื่ออุปกรณ์ เบราว์เซอร์ และบัญชี Stripe รองรับ

## Email Reminder Cron

Endpoint:

```text
/api/cron/booking-reminders
```

ต้องเรียกพร้อม header:

```text
Authorization: Bearer CRON_SECRET
```

ทดสอบบน local:

```powershell
$headers = @{ Authorization = "Bearer local_booking_reminder_secret_change_before_production" }
Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/cron/booking-reminders" -Headers $headers
```

ถ้าสำเร็จจะได้ประมาณนี้:

```text
checkedAt                dueCount results
---------                -------- -------
2026-05-...              0        {}
```

`dueCount: 0` แปลว่า cron ทำงานแล้ว แต่ยังไม่มี booking ที่เข้าเงื่อนไขให้ส่ง reminder

ถ้าส่ง reminder แล้ว ระบบจะอัปเดต booking:

```text
reminderEmailSentAt = timestamp
reminderEmailError = ""
reminderLastCheckedAt = timestamp
```

ข้อความนโยบายมาสายในอีเมล:

```text
If you arrive late, we will still do our best to provide your treatment within the remaining appointment time. If you arrive more than 15 minutes late, your massage time may be shortened accordingly. For a longer delay or no-show, the appointment may be treated as cancelled according to the booking policy, and the deposit or paid amount may be retained.
```

## Deploy ขึ้น Vercel

1. Push โปรเจกต์ขึ้น GitHub
2. Import repo ใน Vercel
3. สร้าง production PostgreSQL เช่น Vercel Postgres, Neon, Supabase หรือ Railway
4. ใส่ `DATABASE_URL` และ `DIRECT_URL` ของ production database
5. ใส่ environment variables ทั้งหมดใน Vercel Project Settings
6. ใส่ Stripe production keys
7. ตั้ง Stripe webhook URL:

```text
https://your-domain.com/api/stripe/webhook
```

8. ใส่ `STRIPE_WEBHOOK_SECRET`
9. ตั้ง SMTP สำหรับส่งอีเมลจริง
10. Deploy ด้วย preset Next.js ของ Vercel

Vercel settings:

```text
Framework Preset: Next.js
Build Command: npm run build
Install Command: npm install
Output Directory: เว้นว่าง
Node.js: ใช้ค่า default ของ Vercel หรือ Node 20+
```

Vercel Cron ตั้งไว้ใน `vercel.json`:

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

หมายความว่า Vercel จะเช็ก reminder ทุก 1 ชั่วโมง

## Checklist ก่อนใช้งานจริง

- เปลี่ยน `OWNER_PASSWORD`
- เปลี่ยน `JWT_SECRET`
- เปลี่ยน `CRON_SECRET`
- ใช้ Stripe live keys
- ตั้ง Stripe webhook production
- ตั้ง SMTP ด้วยอีเมลจริง
- ตั้ง `NEXT_PUBLIC_APP_URL` เป็น domain จริง
- ตั้ง `BUSINESS_TIME_ZONE=Europe/Ljubljana`
- ตรวจที่อยู่ เบอร์โทร อีเมลร้าน และราคา
- ตรวจรูปภาพ remote ว่ายังโหลดได้
- รันเช็กก่อน deploy:

```bash
npm run lint
npm run build
```

## ปัญหาที่พบบ่อย

### Cron ขึ้น `401 Unauthorized`

ต้องส่ง header ให้ถูก:

```text
Authorization: Bearer CRON_SECRET
```

ถ้าตั้ง `CRON_SECRET=abc123` ต้องเรียกแบบ:

```powershell
$headers = @{ Authorization = "Bearer abc123" }
```

### Cron ได้ `dueCount: 0`

ไม่ใช่ error แปลว่ายังไม่มี booking ที่:

- confirmed
- paid
- ยังไม่เคยส่ง reminder
- อยู่ในช่วงเวลาที่ต้องส่ง reminder

### เมลตีกลับ `Address not found`

ปลายทางไม่มีจริงหรือรับเมลไม่ได้ อย่าใช้ `test@example.com` ให้ใช้อีเมลจริงสำหรับทดสอบ

### ขึ้น `password authentication failed for user "admin"`

ให้ restart `npm run dev` ใหม่ เพราะ Prisma ใน dev อาจยังจำ database connection เก่าอยู่

### Stripe ขึ้น invalid API key

ยังใช้ key placeholder อยู่ ต้องเปลี่ยนเป็น Stripe test/live key จริง

## สำหรับคนที่จะเอาไปทำต่อ

ส่วนนี้คือรายการที่คนรับงานต่อควรรู้และควรทำต่อก่อนนำไปใช้จริง

### 1. ตรวจ business content

ต้องตรวจข้อความและข้อมูลร้านทุกหน้า:

- ชื่อร้าน
- ที่อยู่
- เบอร์โทร
- อีเมล
- เวลาเปิดปิด
- ราคาแต่ละคอร์ส
- ภาษาสโลวีเนียว่าถูกต้องตามเจ้าของร้านหรือไม่
- นโยบายมาสายและการยกเลิกนัด

### 2. เปลี่ยน secrets ทั้งหมด

ห้ามใช้ค่า local ใน production:

```env
OWNER_PASSWORD=change_to_real_password
JWT_SECRET=long_random_secret
CRON_SECRET=long_random_secret
```

ควรใช้ password/secret ที่สุ่มยาวพอ และเก็บเฉพาะใน Vercel Environment Variables

### 3. ตั้ง production database

local ใช้ Docker PostgreSQL แต่ production ต้องใช้ database จริง เช่น:

- Neon
- Supabase
- Railway
- Vercel Postgres

หลังได้ database แล้วต้องตั้ง:

```env
DATABASE_URL=production_database_url
DIRECT_URL=production_direct_url
```

แล้วให้ Vercel build รัน migration ผ่าน `npm run build`

### 4. ตั้ง Stripe ให้ครบ

ต้องทำใน Stripe Dashboard:

- เปิดบัญชี Stripe ให้พร้อมรับเงินจริง
- ใส่ live publishable key
- ใส่ live secret key
- สร้าง webhook endpoint ไปที่ `/api/stripe/webhook`
- ใส่ webhook secret ใน Vercel
- ทดสอบ payment ด้วย test mode ก่อนเปิด live

### 5. ตั้ง SMTP จริง

ต้องใช้อีเมลร้านจริง หรือบัญชี Gmail ที่เปิด 2-Step Verification แล้วสร้าง App Password

ต้องตั้ง:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=real_sender@gmail.com
SMTP_PASS=google_app_password
SMTP_FROM=Priya Thai Massage <real_sender@gmail.com>
```

หลัง deploy ต้องทดสอบ:

- เมลยืนยันหลังจ่ายเงิน
- เมล reminder ก่อนเวลานัด
- เมลไม่เข้า spam

### 6. ทดสอบ reminder จริง

สร้าง booking ที่:

```text
bookingStatus = confirmed
paymentStatus = paid
preferredDate/preferredTime = อยู่ใน 24 ชั่วโมงข้างหน้า
reminderEmailSentAt = null
```

แล้วเรียก cron:

```powershell
$headers = @{ Authorization = "Bearer YOUR_CRON_SECRET" }
Invoke-RestMethod -Uri "https://your-domain.com/api/cron/booking-reminders" -Headers $headers
```

ต้องเห็น `dueCount: 1` และอีเมลต้องเข้า inbox จริง

### 7. ตรวจ owner dashboard

ต้องตรวจว่า owner dashboard แสดง:

- total orders
- paid orders
- revenue
- pending payment
- needs attention
- upcoming schedule
- recent orders

และต้องเช็กว่า login/logout ใช้ได้บน mobile ด้วย

### 8. ตรวจ mobile

ต้องทดสอบบนมือถือจริง:

- hamburger เปิด/ปิดได้
- navbar link ถูกต้อง
- หน้า booking กรอกง่าย
- ปุ่ม Book ไป Stripe ได้
- layout ไม่ล้นจอ
- email link/phone/address อ่านง่าย

### 9. เพิ่มระบบ SMS หรือ WhatsApp reminder ถ้าต้องการ

ตอนนี้ reminder ทำเฉพาะอีเมล ถ้าจะทำต่อ:

- SMS แนะนำ Twilio หรือผู้ให้บริการ SMS ในยุโรป
- WhatsApp ใช้ Meta WhatsApp Business Cloud API
- ต้องเพิ่ม field เช่น `reminderSmsSentAt`, `reminderWhatsappSentAt`
- ต้องกันส่งซ้ำเหมือน email reminder

### 10. ทำ admin tools เพิ่ม

ตอนนี้ owner dashboard เป็นหน้าอ่านข้อมูล ถ้าจะต่อยอดควรเพิ่ม:

- ปุ่ม cancel booking
- ปุ่ม refund/manual note
- ปุ่ม mark as contacted
- ปุ่ม resend confirmation email
- ปุ่ม resend reminder email
- filter ตามวันที่/สถานะ
- export CSV

### 11. เพิ่ม monitoring/logging

ก่อนใช้งานจริงควรมี:

- log error ของ Stripe webhook
- log error ของ SMTP
- alert เมื่อ reminder ส่งไม่สำเร็จ
- alert เมื่อ payment สำเร็จแต่ booking ไม่ confirm

### 12. ความปลอดภัย

ควรตรวจ:

- ห้าม commit `.env.local`
- secret ทุกตัวอยู่ใน Vercel env
- cron endpoint ต้องมี `CRON_SECRET`
- owner dashboard ต้อง login เท่านั้น
- production owner password ต้องไม่ใช่ `123456`
- Stripe webhook ต้อง verify signature เสมอ
