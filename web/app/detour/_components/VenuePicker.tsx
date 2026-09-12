'use client';
import { useState } from 'react';
import { Icon, Label, H3, BodySm, Sheet, CTA } from '@/ui';
import { VENUES, type Venue } from '@/lib/detour/venues';

export type PickerOption = Venue | { id: 'here'; name: string; lat: number; lng: number; hint: string };

/** A row from the mockup's `.venue` block plus a sheet of the five endpoints. */
export function VenuePicker({
  label,
  icon = 'flag',
  value,
  sub,
  options = VENUES,
  onChange,
}: {
  label: string;
  icon?: 'flag' | 'compass' | 'pin';
  value: PickerOption;
  sub?: string;
  options?: PickerOption[];
  onChange: (v: PickerOption) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="field">
      <p className="lbl">{label}</p>
      <button
        type="button"
        className="venue"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        style={{ width: '100%', textAlign: 'left' }}
      >
        <div className="ic">
          <Icon name={icon} />
        </div>
        <div style={{ flex: 1 }}>
          <p className="vttl">{value.name}</p>
          <p className="bsm">{sub ?? value.hint}</p>
        </div>
        <Icon name="chev-r" className="" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)}>
        <Label>{label}</Label>
        <H3>pick a place</H3>
        <div className="col" style={{ gap: 8, margin: '14px 0 16px' }}>
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              className="venue"
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                boxShadow: o.id === value.id ? '0 0 0 2px var(--acc)' : undefined,
              }}
            >
              <div className="ic">
                <Icon name={o.id === 'here' ? 'compass' : icon} />
              </div>
              <div style={{ flex: 1 }}>
                <p className="vttl">{o.name}</p>
                <BodySm>{o.hint}</BodySm>
              </div>
              {o.id === value.id ? <Icon name="check" /> : null}
            </button>
          ))}
        </div>
        <CTA variant="ghost" onClick={() => setOpen(false)}>
          Close
        </CTA>
      </Sheet>
    </div>
  );
}
