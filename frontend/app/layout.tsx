import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: "600",
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
      className={geist.variable}
      data-scroll-behavior="smooth"
    >
      <body>{children}</body>
    </html>
  );
}
