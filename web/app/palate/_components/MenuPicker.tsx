'use client';
import { useState } from 'react';
import { Sheet, Label, H3, BodySm, CTA, TextField, Icon } from '@/ui';
import { MENUS, menuDishes } from '@/lib/palate/score';

/** Point at a menu: the three that ship parsed, or paste any menu in any language. */
export function MenuPicker({
  open,
  onClose,
  onPick,
  onPaste,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (menuId: string) => void;
  onPaste: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const [pasting, setPasting] = useState(false);

  return (
    <Sheet open={open} onClose={onClose}>
      <Label>point at a menu</Label>
      <div className="col" style={{ gap: 10, marginTop: 12 }}>
        {MENUS.map((m) => (
          <button key={m.id} type="button" className="dish" style={{ textAlign: 'left' }} onClick={() => onPick(m.id)}>
            <span className="rg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: '#FCE7F0',
                  color: '#B02255',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="fork" size={20} />
              </span>
            </span>
            <span style={{ minWidth: 0 }}>
              <span className="nm" style={{ display: 'block' }}>
                {m.name}
              </span>
              <span className="why" style={{ display: 'block' }}>
                {m.cuisine} · {m.address} · {menuDishes(m).length} dishes
              </span>
            </span>
            <Icon name="chev-r" size={18} />
          </button>
        ))}

        {pasting ? (
          <div className="col" style={{ gap: 10 }}>
            <TextField
              value={text}
              onChange={setText}
              multiline
              autoFocus
              placeholder={'paste the menu here, in any language\nMassaman curry 16\nLarb moo 13'}
            />
            <CTA variant="grad" disabled={text.trim().length < 4} onClick={() => onPaste(text)}>
              Read this menu
            </CTA>
          </div>
        ) : (
          <CTA variant="ghost" icon="plus" onClick={() => setPasting(true)}>
            Paste a menu
          </CTA>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        <BodySm>Camera is out of scope tonight; the three above ship parsed.</BodySm>
      </div>
      <div className="divider" style={{ margin: '14px 0 10px' }} />
      <H3>one table, one menu</H3>
      <BodySm>Everyone in the room sees the menu you pick.</BodySm>
    </Sheet>
  );
}
