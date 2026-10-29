import type { Metadata, Viewport } from "next";
import { Inter, Vazirmatn } from "next/font/google";
import { LangProvider } from "@/components/LangProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-latin" });
const vazir = Vazirmatn({ subsets: ["arabic", "latin"], variable: "--font-fa" });

export const metadata: Metadata = {
  title: "YumSum",
  description: "Recipes from my YumSum Pinterest board",
  appleWebApp: { capable: true, title: "YumSum", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f5f4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${inter.variable} ${vazir.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved language before first paint, so English readers don't see a flash of Persian. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("lang")==="en"){document.documentElement.lang="en";document.documentElement.dir="ltr"}}catch(e){}`,
          }}
        />
      </head>
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
