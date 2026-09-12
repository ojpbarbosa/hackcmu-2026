'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Screen, TopNav, Pill, H1, H3, Body, BodySm, Label, Stat, CTA, Icon } from '@/ui';
import { FAMILY_COLORS, familyKeyFor, zeroAxes, type FamilyKey } from '@/lib/palate/score';
import { Petal } from '../_components/Petal';
import { MenuPicker } from '../_components/MenuPicker';
import { usePalate } from '../_components/usePalate';

const FALLBACK: FamilyKey[] = ['coconut', 'smoky', 'sour', 'herbal', 'sweet', 'fermented'];

/** Screen 2 — your palate: six axes, the families you keep returning to, one hard no. */
export default function PalateMe() {
  const { me, member, act, href, code, state } = usePalate();
  const router = useRouter();
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (state && member && !me) router.replace(href('/palate'));
  }, [state, member, me, router, href]);

  const axes = me?.axes ?? zeroAxes();
  const families = me?.families ?? [];

  return (
    <Screen app="pal" className="col">
      <TopNav
        left={
          <Pill variant="soft" icon="user">
            {member?.name ?? 'you'}
          </Pill>
        }
        right={
          <Link className="icon-btn" href={href('/palate')} aria-label="add dishes">
            <Icon name="plus" size={20} />
          </Link>
        }
      />
      <div className="pad col" style={{ gap: 14, marginTop: 14 }}>
        <div className="between" style={{ alignItems: 'flex-end' }}>
          <div>
            <Label>your palate</Label>
            <H1>{me?.loved?.length ?? 0} dishes in</H1>
          </div>
          <Stat value={families.length} label="families" accent />
        </div>

        <Petal axes={axes} />

        <div className="fams">
          {families.map((f, i) => (
            <div className="f" key={f.label}>
              <i style={{ background: FAMILY_COLORS[f.key ?? familyKeyFor(f.label) ?? FALLBACK[i % 6]] }} />
              <span>{f.label}</span>
              <small>{f.count}</small>
            </div>
          ))}
          {families.length === 0 ? <BodySm>no families yet — name a few more dishes</BodySm> : null}
        </div>

        {me?.never?.length ? (
          <div
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#FEE2E2', boxShadow: 'none' }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#EF4444',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flex: '0 0 auto',
              }}
            >
              <Icon name="plus" size={14} className="xs" />
            </span>
            <p className="bsm" style={{ color: '#7F1D1D' }}>
              <b>{me.never.join(' · ')} · never.</b> Applied to every menu, every table.
            </p>
          </div>
        ) : null}

        {state?.menuId || state?.pastedMenu ? (
          <div className="col" style={{ gap: 6 }}>
            <div className="divider" />
            <H3>the table is reading a menu</H3>
            <Body>
              <Link href={href('/palate/menu')}>open it, ranked for you</Link>
            </Body>
          </div>
        ) : null}
      </div>

      <div className="bottom">
        <CTA variant="grad" icon="cam" onClick={() => setPicking(true)} disabled={!code}>
          Point at a menu
        </CTA>
      </div>

      <MenuPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={async (menuId) => {
          setPicking(false);
          await act('pickMenu', { menuId });
          router.push(href('/palate/menu'));
        }}
        onPaste={async (text) => {
          setPicking(false);
          await act('pasteMenu', { text });
          router.push(href('/palate/menu'));
        }}
      />
    </Screen>
  );
}
