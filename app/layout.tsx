import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simulador — Dental Card",
  description: "Simulador de disparos e conversas da atendente Ana (dental-card).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
