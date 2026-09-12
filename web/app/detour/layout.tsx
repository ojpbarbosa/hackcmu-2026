import '@/ui/tokens.css';
export const metadata = { title: 'Detour' };

export default function DetourLayout({ children }: { children: React.ReactNode }) {
  return <div className="app-det">{children}</div>;
}
