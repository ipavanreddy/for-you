import './globals.css';

export const metadata = {
  title: 'A little something for you',
  description: 'Locked. Tap the code and see what is inside.',
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: '#05020C',
  width: 'device-width',
  initialScale: 1,
  // The keypad and the cake scene are laid out for one screenful.
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&family=Caveat:wght@500;600&family=Great+Vibes&family=Fredoka:wght@300..600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
