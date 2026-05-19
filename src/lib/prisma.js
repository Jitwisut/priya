import { PrismaClient } from '@/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

function createMissingEnvProxy() {
  return new Proxy(
    {},
    {
      get() {
        throw new Error('DATABASE_URL is not configured.')
      },
    },
  )
}

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    return createMissingEnvProxy()
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// Ensure the global namespace has a `prisma` property (useful for Next.js hot reloading in dev)
const globalForPrisma = globalThis

const connectionString = process.env.DATABASE_URL
const cachedPrisma = globalForPrisma.prisma

if (
  process.env.NODE_ENV !== 'production' &&
  cachedPrisma &&
  globalForPrisma.prismaConnectionString &&
  globalForPrisma.prismaConnectionString !== connectionString
) {
  cachedPrisma.$disconnect().catch(() => {})
  globalForPrisma.prisma = undefined
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaConnectionString = connectionString
}
