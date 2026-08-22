-- Платформенный оператор: отдельная сущность, не принадлежит ни одной компании.
CREATE TABLE "platform_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

CREATE TABLE "platform_sessions" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "platform_sessions_refreshTokenHash_key" ON "platform_sessions"("refreshTokenHash");
CREATE INDEX "platform_sessions_adminId_expiresAt_idx" ON "platform_sessions"("adminId", "expiresAt");

CREATE TABLE "platform_audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "companyId" TEXT,
    "details" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "platform_audit_logs_adminId_createdAt_idx" ON "platform_audit_logs"("adminId", "createdAt");
CREATE INDEX "platform_audit_logs_companyId_createdAt_idx" ON "platform_audit_logs"("companyId", "createdAt");

ALTER TABLE "platform_sessions" ADD CONSTRAINT "platform_sessions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "platform_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "platform_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;