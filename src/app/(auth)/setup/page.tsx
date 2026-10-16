import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAuthProvider } from "@/lib/auth-provider";
import { isSelfHost } from "@/lib/deployment";
import { SetupForm } from "@/components/auth/SetupForm";

// First-run setup, self-host only: the first visitor creates the first account
// and is signed straight in. Once any account exists the page redirects away.
//
// The redirect depends on DEPLOYMENT_MODE at run time, but `next build` runs in
// cloud mode and would otherwise freeze this route as a static redirect to
// /login. Force it dynamic so a self-host image can still reach the form.
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!isSelfHost()) redirect("/login");

  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const provider = await getAuthProvider();
  if (!(await provider.needsSetup())) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">Set up Cairn</h1>
        <p className="text-sm text-muted">
          Create the first account on this instance. You can invite other people
          once you are in.
        </p>
      </div>

      <SetupForm />
    </div>
  );
}
