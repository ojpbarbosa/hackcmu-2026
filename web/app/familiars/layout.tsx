import '@/ui/dusk.css';

export const metadata = { title: 'Familiars' };

export default function FamiliarsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dusk">
      <div className="device">{children}</div>
    </div>
  );
}
