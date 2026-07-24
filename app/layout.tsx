import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Universidad Nacional de Concepción",
  description: "Portal institucional de la Universidad Nacional de Concepción - Paraguay",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-950 text-white antialiased`} suppressHydrationWarning>
        
        <Header />
        
        <main id="main-content" className="min-h-screen">
          {children}
        </main>
        
        <Footer />
        
      </body>
    </html>
  );
}