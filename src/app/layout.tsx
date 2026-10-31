import type { Metadata } from "next";
import "./globals.css";
import DynamicNavHeader from "@/components/DynamicNavHeader";
import DynamicFooter from "@/components/DynamicFooter";
import AuthProvider from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/shared/ToastContext";
import GlobalSoundListener from "@/components/shared/GlobalSoundListener";

export const metadata: Metadata = {
  title: "Atlas | Cinephile & Gamer Hub",
  description:
    "Centro de mando personal para cine y videojuegos con Sofa Knowledge y Game Knowledge.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-cine-950 text-cine-100 antialiased min-h-screen flex flex-col selection:bg-purple-600 selection:text-white">
        <AuthProvider>
          <ToastProvider>
            <GlobalSoundListener />
            <DynamicNavHeader />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
            <DynamicFooter />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
