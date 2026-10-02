export default function manifest() {
  return {
    name: "JOSJIS Sistem Integrasi Pendataan Mikro Kuamang Kuning",
    short_name: "JOSJIS",
    description: "Sistem Integrasi Pendataan Mikro Kuamang Kuning",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#006b3f",
    orientation: "portrait-primary",
    scope: "/",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
