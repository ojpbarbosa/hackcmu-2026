'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Screen, TopNav, H1, Body, BodySm, Label, Chip, CTA, Icon } from '@/ui';
import { DishRow } from '../_components/DishRow';
import { MenuPicker } from '../_components/MenuPicker';
import { PalDock } from '../_components/PalDock';
import { clockOf, usePalate } from '../_components/usePalate';

/** Screen 3 — the menu, ranked for one palate, with a reason on every line. */
export default function PalateMenu() {
  const { me, member, state, header, ranked, reasons, act, href } = usePalate();
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [section, setSection] = useState<string>('for you');
  const askedFor = useRef<string>('');

  const menuKey = `${state?.menuId ?? state?.pastedMenu?.at ?? ''}|${member?.id ?? ''}`;

  // one batched reason call per member per menu; the room caches the result for everyone
  useEffect(() => {
    if (!me || !state || ranked.length === 0 || !member) return;
    if (askedFor.current === menuKey) return;
    if (Object.keys(reasons).length > 0) {
      askedFor.current = menuKey;
      return;
    }
    askedFor.current = menuKey;
    act('reasons', {}).catch(() => {
      askedFor.current = '';
    });
  }, [me, state, ranked.length, member, reasons, act, menuKey]);

  const sections = useMemo(() => {
    const names: string[] = [];
    for (const s of ranked) if (s.dish.section && !names.includes(s.dish.section)) names.push(s.dish.section);
    return names;
  }, [ranked]);

  const rows = section === 'for you' ? ranked : ranked.filter((s) => s.dish.section === section);

  if (state && !header) {
    return (
      <Screen app="pal" className="col" dock>
        <TopNav
          left={
            <Link className="back" href={href('/palate/me')} aria-label="back">
              <Icon name="chev-l" size={20} />
            </Link>
          }
          title="Menu"
        />
        <div className="pad col" style={{ gap: 14, marginTop: 20 }}>
          <Label>no menu yet</Label>
          <H1>point at a menu</H1>
          <Body>Pick one of the three that ship parsed, or paste any menu, in any language.</Body>
          <CTA variant="grad" icon="cam" onClick={() => setPicking(true)}>
            Point at a menu
          </CTA>
        </div>
        <MenuPicker
          open={picking}
          onClose={() => setPicking(false)}
          onPick={async (menuId) => {
            setPicking(false);
            await act('pickMenu', { menuId });
          }}
          onPaste={async (text) => {
            setPicking(false);
            await act('pasteMenu', { text });
          }}
        />
        <PalDock at="menu" href={href} />
      </Screen>
    );
  }

  return (
    <Screen app="pal" className="col" dock>
      <TopNav
        left={
          <Link className="back" href={href('/palate/me')} aria-label="back">
            <Icon name="chev-l" size={20} />
          </Link>
        }
        title="Menu"
        right={
          <button type="button" className="icon-btn" onClick={() => setPicking(true)} aria-label="another menu">
            <Icon name="cam" size={20} />
          </button>
        }
      />

      <div className="pad col" style={{ gap: 14, marginTop: 16 }}>
        <div className="rest">
          <div className="ic">
            <Icon name="fork" size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="vttl">{header?.name ?? '…'}</p>
            <p className="sub">
              {header?.sub}
              {state?.menuAt ? ` · read ${clockOf(state.menuAt)}` : ''}
            </p>
          </div>
          <span className="pill soft" style={{ height: 30, fontSize: 12 }}>
            {header?.count ?? 0} dishes
          </span>
        </div>

        <div className="chips">
          <Chip on={section === 'for you'} onClick={() => setSection('for you')}>
            for you
          </Chip>
          {sections.map((s) => (
            <Chip key={s} on={section === s} onClick={() => setSection(s)}>
              {s}
            </Chip>
          ))}
        </div>

        {!me ? (
          <div className="col" style={{ gap: 10 }}>
            <BodySm>Build a palate first and this menu re-ranks itself for you.</BodySm>
            <CTA variant="ghost" onClick={() => router.push(href('/palate'))}>
              Build my palate
            </CTA>
          </div>
        ) : null}

        <div className="dishes">
          {rows.map((s) => (
            <DishRow
              key={s.dish.id}
              scored={s}
              reason={reasons[s.dish.id]}
              askHref={href(`/palate/ask/${s.dish.id}`)}
            />
          ))}
          {rows.length === 0 ? <BodySm>nothing in this section</BodySm> : null}
        </div>
      </div>

      <MenuPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={async (menuId) => {
          setPicking(false);
          await act('pickMenu', { menuId });
        }}
        onPaste={async (text) => {
          setPicking(false);
          await act('pasteMenu', { text });
        }}
      />

      <PalDock at="menu" href={href} />
    </Screen>
  );
}
