import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diet Genie — Your wish for the perfect diet is granted",
  description: "AI-powered magical health & diet assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
