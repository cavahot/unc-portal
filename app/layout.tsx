import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getNavigation, FALLBACK_NAVIGATION } from "@/lib/cms/queries/navigation";
import AccessibilityPanel from "@/components/accessibility/AccessibilityPanel";

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=JSON.parse(localStorage.getItem('unc-a11y')||'{}'),h=document.documentElement,c=h.classList;if(s.grayscale)c.add('a11y-grayscale');if(s.highContrast)c.add('a11y-high-contrast');if(s.negative)c.add('a11y-negative');if(s.lightBg)c.add('a11y-light-bg');if(s.underlineLinks)c.add('a11y-underline-links');if(s.readableFont)c.add('a11y-readable-font');if(s.fontSize&&s.fontSize!==100)h.style.fontSize=s.fontSize+'%'}catch(e){}`,
          }}
        />
      </head>
      <body className={`${inter.className} bg-slate-950 text-white antialiased`} suppressHydrationWarning>

        <Header navigation={navigation} />

        <main id="main-content" className="min-h-screen">
          {children}
        </main>

        <Footer />

        <AccessibilityPanel />

      </body>
    </html>
  );
}