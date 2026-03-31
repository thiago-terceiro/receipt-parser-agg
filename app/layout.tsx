import type { Metadata } from "next";

import "./globals.css";
import { AppSessionProvider } from "./session-provider";

export const metadata: Metadata = {
  title: "Receipt AI",
  description: "Receipt extraction UI backed by Hugging Face Inference on Vercel.",
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="en">
      <body>
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
};

export default RootLayout;
