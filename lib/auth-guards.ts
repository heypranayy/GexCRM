import { getSession } from "@/lib/auth-server";
import { NextResponse } from "next/server";

export async function requireOwnerOrAdmin(userId: string) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.user.id !== userId && session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return { session };
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  return { session };
}

export async function requirePermission(resource: string, action: string) {
  const session = await getSession();
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Unauthenticated" }, { status: 401 }),
    };
  }

  const { hasPermission } = await import("./permissions");
  const allowed = await hasPermission(session.user.id, resource, action);
  if (!allowed) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Forbidden - Insufficient permissions" }, { status: 403 }),
    };
  }

  return { authorized: true, session };
}

