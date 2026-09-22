import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dlbeen Influencers System",
  description: "Dlbeen Group influencer partnerships, content commitments, performance and monthly reports.",
  icons: {
    icon: "/brand/logo.jpg",
    shortcut: "/brand/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
