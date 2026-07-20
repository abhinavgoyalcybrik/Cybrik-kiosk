import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./signal.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-kiosk-sans",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-kiosk-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cybrik EduGraph",
  description: "Find your desired university with profile-based recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
