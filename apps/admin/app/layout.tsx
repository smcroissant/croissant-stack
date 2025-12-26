import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@repo/ui/components/sidebar";
import "@repo/ui/globals.css";
import { AppSidebar } from "./components/app-sidebar";
import { AuthProvider } from "./providers/auth-provider";
import { ThemeProvider } from "./components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Twitter Clone",
  description: "A Twitter-like social media app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
          <AuthProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <main>
                  <SidebarTrigger />
                  {children}
                </main>
              </SidebarInset>
            </SidebarProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
