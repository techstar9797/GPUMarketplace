import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KernelWatch — GPU Cost Intelligence",
  description: "GPU compute pricing across CoreWeave, Lambda Labs, AWS, GCP, Azure, Nebius. SkyPilot × GPU MODE = up to 15× savings.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
