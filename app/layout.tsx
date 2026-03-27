import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "AI Audiobook Reader",
  description: "Upload books, listen to chapters, and chat with your book.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen w-full bg-zinc-950 text-white antialiased">
        <div className="min-h-screen w-full">
          <Navbar />
          {children}
        </div>
      </body>
    </html>
  );
}