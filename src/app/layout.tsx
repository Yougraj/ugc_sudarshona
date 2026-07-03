import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sudarshona's UGC Hub ⚡",
  description: "Certified clean vibes. Explore user generated social content, fits, lookbooks, and beauty reviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
