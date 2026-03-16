import "server-only";

import type { NextRequest } from "next/server";
import type { Prisma, Roles } from "@/app/generated/prisma";
import prisma from "@/lib/prisma";

type AuditClient = Pick<typeof prisma, "auditLog">;

type AuditActor = {
  id?: string;
  role?: Roles | null;
};

type CreateAuditLogInput = {
  actor?: AuditActor | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  summary: string;
  request?: NextRequest | Request | null;
  metadata?: Prisma.InputJsonValue;
  client?: AuditClient;
};

function getRequestHeader(
  request: NextRequest | Request | null | undefined,
  name: string,
) {
  if (!request) return null;
  return request.headers.get(name);
}

function getIpAddress(request: NextRequest | Request | null | undefined) {
  const forwardedFor = getRequestHeader(request, "x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return getRequestHeader(request, "x-real-ip");
}

export async function createAuditLog({
  actor,
  action,
  entityType,
  entityId,
  entityLabel,
  summary,
  request,
  metadata,
  client,
}: CreateAuditLogInput) {
  const auditClient = client ?? prisma;

  return auditClient.auditLog.create({
    data: {
      actorUserId: actor?.id ?? null,
      actorRole: actor?.role ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      entityLabel: entityLabel ?? null,
      summary,
      routePath: request ? new URL(request.url).pathname : null,
      method: request?.method ?? null,
      ipAddress: getIpAddress(request),
      userAgent: getRequestHeader(request, "user-agent"),
      metadata,
    },
  });
}
