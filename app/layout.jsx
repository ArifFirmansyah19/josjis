import "./globals.css";

import Providers from "./providers";

export const metadata = {
  title: "JOSJIS",
  description: "Sistem Integrasi Pendataan Mikro Kuamang Kuning",

  manifest: "/manifest.webmanifest",

  icons: {
    apple: "/icons/apple-touch-icon.png",
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JOSJIS",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
