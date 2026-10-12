import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-lg font-display tracking-tight">
          Cairn
        </p>
        <div className="rounded-xl border border-edge bg-surface p-6 shadow-lift">
          {children}
        </div>
      </div>
    </main>
  );
}