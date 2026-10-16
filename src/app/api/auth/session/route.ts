import { clearSession } from "@/lib/auth";
import { getAuthProvider } from "@/lib/auth-provider";

// Cloud mode only: the browser swaps a freshly signed-in Firebase ID token for
// an httpOnly session cookie here. Self-host sign-in goes through a server
// action instead, so this route is never called in that mode.

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

  const provider = await getAuthProvider();
  const result = await provider.signIn({ idToken });

  if (!result.success) {
    return Response.json(
      { error: result.error ?? "Could not start a session." },
      { status: result.status ?? 401 },
    );
  }
  return Response.json({ ok: true });
}

/** Logs out: drops the session cookie. */
export async function DELETE() {
  await clearSession();
  return Response.json({ ok: true });
}
