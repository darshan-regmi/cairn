import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { RequestResetForm } from "@/components/auth/RequestResetForm";

export default async function ResetRequestPage() {
  const session = await auth();
  if (session?.user) redirect("/projects");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted">
          Enter your email and we&rsquo;ll create a reset link.
        </p>
      </div>

      <RequestResetForm />

      <p className="text-center text-sm text-muted">
        Remembered it?{" "}
        <Link
          href="/login"
          className="rounded text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Back to log in
        </Link>
      </p>
    </div>
  );
}
