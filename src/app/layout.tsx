import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "PIP · E-ducare Project Implementation Process";
const description =
  "E-ducare's internal tool for managing charity projects, from the applicant's request through board approval, fundraising, implementation and monitoring.";

export const metadata: Metadata = {
  // Resolves the Open Graph image URL; Previews share the production image.
  metadataBase: new URL("https://pip.e-ducare-org.workers.dev"),
  title,
  description,
  applicationName: "PIP",
  openGraph: {
    type: "website",
    siteName: "PIP by E-ducare",
    title,
    description,
    images: [{ url: "/images/educare-logo.png", width: 447, height: 447, alt: "E-ducare logo" }],
  },
  twitter: { card: "summary", title, description, images: ["/images/educare-logo.png"] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
