import './globals.css';

export const metadata = {
  title: 'AI Chatbot',
  description: 'Crafted by Gagan',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  );
}
