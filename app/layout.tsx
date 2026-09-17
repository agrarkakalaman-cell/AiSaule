import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ai.Saule — ҚазҰАЗУ студенттеріне қазақ тілі",
  description: "ҚазҰАЗУ-да білім алатын шетелдік студенттерге арналған қазақ тілін үйрену порталы.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Ai.Saule — ҚазҰАЗУ студенттеріне қазақ тілі",
    description: "Шетелдік студенттерге арналған қазақ тілін үйрену порталы.",
    images: [{ url: "/og.png", width: 1728, height: 910, alt: "Ai.Saule — ҚазҰАЗУ студенттеріне қазақ тілі" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ai.Saule — ҚазҰАЗУ студенттеріне қазақ тілі",
    description: "Шетелдік студенттерге арналған қазақ тілін үйрену порталы.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="kk"><body>{children}</body></html>;
}
