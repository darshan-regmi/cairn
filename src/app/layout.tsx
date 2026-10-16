import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cairn",
  description:
    "Plan milestones, track tasks, log meetings, and collect evidence — everything your project needs in one place.",
  icons: {
    icon: [
      { url: "/cairn-icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
