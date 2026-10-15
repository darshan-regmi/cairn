import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { adminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

// Turns a Firebase ID token into an httpOnly session cookie. This is the only
// way a session is created.
export async function POST(request: Request) {
  let idToken: unknown;
  try {
    ({ idToken } = await request.json());
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof idToken !== "string") {
    return Response.json({ error: "Missing token." }, { status: 400 });
  }

  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    // An unverified address must never open a session.
    if (!decoded.email_verified || !decoded.email) {
      return Response.json(
        { error: "Verify your email address first." },
        { status: 403 },
      );
    }

    const account = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: { id: true },
    });
    if (!account) {
      return Response.json(
        { error: "No account is linked to this login." },
        { status: 403 },
      );
    }

    const cookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });
    (await cookies()).set(SESSION_COOKIE_NAME, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Could not start a session." },
      { status: 401 },
    );
  }
}

/** Logs out: drops the session cookie. */
export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE_NAME);
  return Response.json({ ok: true });
}
