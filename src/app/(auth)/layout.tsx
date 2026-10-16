import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <img src="/cairn-logo.svg" alt="Cairn" className="mx-auto mb-6 block h-7 w-auto" />
        <div className="rounded-xl border border-edge bg-surface p-6 shadow-lift">
          {children}
        </div>
      </div>
    </main>
  );
}