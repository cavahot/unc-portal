import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getNavigation, FALLBACK_NAVIGATION } from "@/lib/cms/queries/navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Universidad Nacional de Concepción",
  description: "Portal institucional de la Universidad Nacional de Concepción - Paraguay",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navigation = await getNavigation().catch(() => FALLBACK_NAVIGATION);

  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-950 text-white antialiased`} suppressHydrationWarning>

        <Header navigation={navigation} />

        <main id="main-content" className="min-h-screen">
          {children}
        </main>

        <Footer />

      </body>
    </html>
  );
}