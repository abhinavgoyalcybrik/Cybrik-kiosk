import type { Metadata } from "next";
import { DM_Mono, Manrope, Newsreader } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const dmMono = DM_Mono({
  variable: "--font-utility",
  subsets: ["latin"],
  weight: ["400", "500"],
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
      className={`${manrope.variable} ${newsreader.variable} ${dmMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
