import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-display",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cybrik Solutions | Your route to global education",
  description: "Discover universities that fit your profile, compare courses, and prepare every document with confidence.",
  icons: { icon: "/cybrik-logo.png", apple: "/cybrik-logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${dmSans.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
