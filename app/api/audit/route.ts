import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { json, preflight, serverError } from "@/lib/http";
import { getAudit } from "@/lib/mongodb";

// GET /api/audit — the latest audit entries, newest first. Admin only.
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof Response) return admin;

  try {
    const audit = await getAudit();
    const entries = await audit.find().sort({ at: -1 }).limit(200).toArray();

    return json(entries);
  } catch (err) {
    return serverError(err, "GET /api/audit", "Could not read from the database");
  }
}

export async function OPTIONS() {
  return preflight();
}
