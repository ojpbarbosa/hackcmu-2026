'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Screen, TopNav, Pill, H3, H4, BodySm, Label, CTA, Icon, Avatar, Sheet, QR } from '@/ui';
import { MatchRing } from '../_components/MatchRing';
import { clockOf, money, usePalate } from '../_components/usePalate';

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

/** Screen 4 — the table: three palates, one order. */
export default function PalateTable() {
  const { state, seated, merged, header, act, href, code, member } = usePalate();
  const [inviting, setInviting] = useState(false);

  const nameOf = (id: string) => seated.find((m) => m.id === id)?.name ?? 'someone';
  const heads = seated.length;
  const qty = Math.max(1, Math.ceil(heads / 2));

  const total =
    merged.everyone.slice(0, 4).reduce((sum, r) => sum + (r.dish.price ?? 0) * qty, 0) +
    merged.splits.slice(0, 2).reduce((sum, r) => sum + (r.dish.price ?? 0), 0);

  const ordered = state?.order ?? [];
  const orderRows = ordered
    .map((o) => ({ o, dish: [...merged.everyone, ...merged.splits].find((r) => r.dish.id === o.dishId)?.dish }))
    .filter((r) => r.dish);
  const orderTotal = orderRows.reduce((sum, r) => sum + (r.dish?.price ?? 0) * r.o.qty, 0);

  const joinUrl =
    typeof window === 'undefined' ? '' : `${window.location.origin}/palate?room=${code ?? ''}`;

  return (
    <Screen app="pal" className="col">
      <TopNav
        left={
          <Link className="back" href={href('/palate/menu')} aria-label="back">
            <Icon name="chev-l" size={20} />
          </Link>
        }
        title="Table"
        right={
          <button type="button" className="icon-btn" onClick={() => setInviting(true)} aria-label="invite">
            <Icon name="plus" size={20} />
          </button>
        }
      />

      <div className="pad table col" style={{ gap: 16, marginTop: 16 }}>
        <div className="heads">
          <div className="stack">
            {seated.map((m) => (
              <Avatar key={m.id} name={m.name} tone={m.tone} />
            ))}
            {heads === 0 ? <Avatar name="?" /> : null}
          </div>
          <div style={{ minWidth: 0 }}>
            <H3>
              {heads} {heads === 1 ? 'palate' : 'palates'}, one order
            </H3>
            <p className="sub">
              {header?.name ?? 'no menu yet'}
              {state?.menuAt ? ` · merged ${clockOf(state.menuAt)}` : ''}
            </p>
          </div>
        </div>

        {heads < 2 ? (
          <div className="card col" style={{ gap: 8 }}>
            <Label>waiting for the table</Label>
            <BodySm>
              Show the code to the rest of the table. Every palate that arrives changes what everyone will love.
            </BodySm>
            <Pill variant="ink" icon="users" onClick={() => setInviting(true)}>
              {code ?? '·····'}
            </Pill>
          </div>
        ) : null}

        <div className="sect">
          <p className="h4">
            <span className="dot" />
            everyone will love
          </p>
          {merged.everyone.slice(0, 4).map((r) => {
            const scores = seated.map((m) => r.scores[m.id]).filter((n) => typeof n === 'number');
            return (
              <div className="dish" key={r.dish.id}>
                <MatchRing score={mean(scores)} tone="ok" />
                <div style={{ minWidth: 0 }}>
                  <div className="nm">{r.dish.name}</div>
                  <div className="why">{scores.join(' · ')} across the table</div>
                </div>
                <div className="price">×{qty}</div>
              </div>
            );
          })}
          {merged.everyone.length === 0 ? (
            <BodySm>nothing clears 75 for everyone yet — the wall is honest about that</BodySm>
          ) : null}
        </div>

        <div className="sect">
          <p className="h4">
            <span className="dot w" />
            splits the table
          </p>
          {merged.splits.slice(0, 2).map((r) => {
            const scores = seated.map((m) => r.scores[m.id]).filter((n) => typeof n === 'number');
            const others = seated.filter((m) => m.id !== r.lowest).map((m) => m.name);
            return (
              <div className="dish" key={r.dish.id}>
                <MatchRing score={mean(scores)} tone="warn" />
                <div style={{ minWidth: 0 }}>
                  <div className="nm">{r.dish.name}</div>
                  <div className="why">
                    {nameOf(r.lowest)} rates it {r.scores[r.lowest]} · order as a side for {others.join(' and ')}
                  </div>
                </div>
                <div className="price">×1</div>
              </div>
            );
          })}
          {merged.splits.length === 0 ? <BodySm>no dish splits this table by more than 40 points</BodySm> : null}
        </div>

        {merged.blocked.length ? (
          <div className="sect">
            <p className="h4">
              <span className="dot" style={{ background: 'var(--danger)' }} />
              off the table
            </p>
            {merged.blocked.slice(0, 4).map((b) => (
              <div className="dish dim" key={b.dish.id}>
                <MatchRing score={0} tone="never" label="—" />
                <div style={{ minWidth: 0 }}>
                  <div className="nm">{b.dish.name}</div>
                  <div className="why">
                    {nameOf(b.by)} never eats {b.allergen}
                  </div>
                </div>
                <span
                  className="pill soft"
                  style={{ height: 28, fontSize: 11, background: '#FEE2E2', color: '#B91C1C', padding: '0 10px' }}
                >
                  never
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {orderRows.length ? (
          <div className="sect">
            <p className="h4">
              <span className="dot" style={{ background: 'var(--ink)' }} />
              the order
            </p>
            <div className="card col" style={{ gap: 10 }}>
              {orderRows.map(({ o, dish }) => (
                <div className="between" key={o.dishId}>
                  <BodySm>
                    {o.qty} × {dish!.name}
                  </BodySm>
                  <span className="price">{money((dish!.price ?? 0) * o.qty)}</span>
                </div>
              ))}
              <div className="divider" />
              <div className="between">
                <H4>total</H4>
                <span className="price">{money(orderTotal)}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="bottom">
        <CTA
          variant="grad"
          onClick={() => act('buildOrder')}
          disabled={heads === 0 || merged.everyone.length + merged.splits.length === 0}
        >
          Build the table&apos;s order{total ? ` · ${money(total)}` : ''}
        </CTA>
        {orderRows.length ? (
          <CTA variant="ghost" onClick={() => act('resetOrder')}>
            Clear the order
          </CTA>
        ) : null}
      </div>

      <Sheet open={inviting} onClose={() => setInviting(false)}>
        <Label>join this table</Label>
        <div className="col" style={{ gap: 12, alignItems: 'center', marginTop: 12 }}>
          <QR url={joinUrl} />
          <Pill variant="ink" icon="users">
            {code ?? '·····'}
          </Pill>
          <BodySm>{member ? `you are ${member.name}` : 'open on another phone to add a palate'}</BodySm>
        </div>
      </Sheet>
    </Screen>
  );
}
