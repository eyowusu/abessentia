import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { getCanonicalSiteUrl } from "@/lib/server/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getCanonicalSiteUrl()),
  title: {
    default: "AB Essentia — Beauty By Nature",
    template: "%s | AB Essentia",
  },
  description:
    "Shop premium handcrafted natural skincare at AB Essentia — black soaps, body butters, hair oils and more, made in Ghana.",
  openGraph: {
    siteName: "AB Essentia",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen flex flex-col bg-background text-foreground font-sans">
        <Navigation />
        <main className="flex-1 pt-24">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
