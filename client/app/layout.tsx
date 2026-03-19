import type { Metadata } from "next";
import Script from "next/script";
import { REM, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/contexts/ToastContext";
import { LoadingProvider } from "@/components/providers/LoadingProvider";
import { ProfileModalProviderWrapper } from "@/components/providers/ProfileModalProviderWrapper";

const rem = REM({
  variable: "--font-rem",
  subsets: ["latin", "vietnamese"],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "vietnamese"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "GenHub",
  description: "Nền Tảng Thuê Kho & Fulfillment Toàn Diện",
  icons: {
    icon: "/assets/icongenhub.svg?v=3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${rem.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://api.mapbox.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.mapbox.com" />
        <link rel="preload" href="/assets/Genhubv2.svg" as="image" />
      </head>
      <body
        className={`antialiased font-sans`}
      >
        <Script 
          src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js" 
          strategy="lazyOnload" 
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            <LoadingProvider>
              <ProfileModalProviderWrapper>
                {children}
              </ProfileModalProviderWrapper>
            </LoadingProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
