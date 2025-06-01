import "./globals.css";

export const metadata = {
  title: "Mareeba Badminton Club",
  description: "Your local badminton community in Mareeba, QLD",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
