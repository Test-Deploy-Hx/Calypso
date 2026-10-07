import "./globals.css";

export const metadata = {
  title: "Hyphen Deploy Demo",
  icons: {
    apple: [{ url: "/images/apple-touch-icon.png", sizes: "180x180" }],
    icon: [
      { url: "/images/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/images/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
  },
  manifest: "/images/site.webmanifest",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
