# Local Database With Docker

This project uses PostgreSQL for Prisma.

## Start

```bash
npm run db:up
```

The database runs on `127.0.0.1:55432` by default.

## Environment

Copy `.env.example` to `.env.local` and keep these values aligned with Docker Compose.

```env
POSTGRES_USER=admin
POSTGRES_PASSWORD=adminpassword
POSTGRES_DB=priya_db
POSTGRES_PORT=55432
DATABASE_URL=postgresql://admin:adminpassword@127.0.0.1:55432/priya_db
DIRECT_URL=postgresql://admin:adminpassword@127.0.0.1:55432/priya_db
```

## Prisma

Run migrations after the database is healthy.

```bash
npm run db:migrate
```

Open Prisma Studio.

```bash
npm run db:studio
```

## Stop

```bash
npm run db:down
```

The named Docker volume `priya_postgres_data` keeps database data between restarts.
