import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FYP Planner",
  description:
    "Plan milestones, track tasks, log supervisor meetings, and collect evidence for your final year project.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}