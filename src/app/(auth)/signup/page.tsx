import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default async function SignUpPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="text-sm text-muted">
          Your final year project, organised in one place.
        </p>
      </div>

      <SignUpForm />

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <a href="/login" className="text-accent underline underline-offset-4">
          Log in
        </a>
      </p>
    </div>
  );
}