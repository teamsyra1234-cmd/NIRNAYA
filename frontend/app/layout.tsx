import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "NIRNAYA | Land Policy Intelligence", description: "Evidence-to-decision workspace for research, geospatial analysis and policy simulation in Indian land governance.", icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html> }
