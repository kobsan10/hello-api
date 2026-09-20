import type { JwtPayload } from "@/lib/auth";
import { getAudit, type AuditAction } from "@/lib/mongodb";

export async function recordAudit(
  user: JwtPayload,
  action: AuditAction,
  itemId?: string,
  detail?: string
) {
  const audit = await getAudit();
  await audit.insertOne({
    action,
    itemId,
    detail,
    userId: user.id,
    username: user.username,
    at: new Date(),
  });
}
