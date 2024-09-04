import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AntRootLayout from "@/components/rootlayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Route Optimizer',
  description: 'A route optimization application',
  manifest: '/manifest.json',
  themeColor: '#000000',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
          <AntRootLayout>
             {children}
          </AntRootLayout>
      </body>
    </html>
  );
}
