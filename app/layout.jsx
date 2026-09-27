import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "JOSJIS",
  description: "Sistem Integrasi Pendataan Mikro Kuamang Kuning",
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
