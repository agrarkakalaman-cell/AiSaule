import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TILIN.AI — Қазақша сөйлей бастаңыз",
  description: "Қазақ тілін күнделікті диалогтар, қысқа сабақтар және жеке қарқынмен үйренуге арналған платформа.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "TILIN.AI — Қазақша сөйлей бастаңыз",
    description: "Қазақ тілін күнделікті диалогтар, қысқа сабақтар және жеке қарқынмен үйреніңіз.",
    images: [{ url: "/og.png", width: 1728, height: 910, alt: "TILIN.AI — Қазақша сөйлей бастаңыз" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TILIN.AI — Қазақша сөйлей бастаңыз",
    description: "Қазақ тілін күнделікті диалогтар, қысқа сабақтар және жеке қарқынмен үйреніңіз.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="kk"><body>{children}</body></html>;
}
