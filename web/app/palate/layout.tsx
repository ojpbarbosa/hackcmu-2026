import '@/ui/tokens.css';
export const metadata = { title: 'Palate' };

export default function PalateLayout({ children }: { children: React.ReactNode }) {
  return <div className="app-pal">{children}</div>;
}
