import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Painel de Gestão de Projetos",
  description: "Visão gerencial dos projetos do time, sincronizada com o Jira.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
