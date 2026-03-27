import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Receipt AI",
  description: "Receipt extraction UI backed by Hugging Face Inference on Vercel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
