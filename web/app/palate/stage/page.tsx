'use client';
import { useEffect, useMemo, useState } from 'react';
import { StagePage, ModelLadder, H2, H3, Body, Label, Pill } from '@/ui';
import { useRoom } from '@/hooks/useRoom';
import { dishesFor, menuHeader, type PalateState } from '@/lib/apps/palate';
import { INGREDIENT_COUNT, mergeTable, rankMenu } from '@/lib/palate/score';
import { clockOf } from '../_components/usePalate';

const TONES = ['#FFE6A8', '#C8D6F7', '#FFD5E5', '#D9EED4'];
const W = 540;
const H = 430;
const FONT = '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif';

const listOf = (xs: string[]): string =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

/** The projector view: three palates as overlapping circles, the dishes they share lit
 *  in berry, the ones nobody can vouch for left grey. */
export default function PalateStage() {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    setCode(new URLSearchParams(window.location.search).get('room')?.toUpperCase() ?? null);
  }, []);

  const { state, members, events, doc } = useRoom<PalateState>('palate', code, null);
  const header = state ? menuHeader(state) : null;
  const dishes = useMemo(() => (state ? dishesFor(state) : []), [state]);
  const merged = useMemo(() => mergeTable(state?.palates ?? {}, dishes, state?.known), [state, dishes]);

  const seated = members.filter((m) => state?.palates[m.id]);
  const nameOf = (id: string) => seated.find((m) => m.id === id)?.name ?? id;

  // one ring per palate, laid out around the middle so they always overlap
  const people = seated.map((m, i) => {
    const ang = -Math.PI / 2 + (i * Math.PI * 2) / Math.max(1, seated.length);
    const r = seated.length === 1 ? 0 : 74;
    const x = W / 2 + Math.cos(ang) * r;
    const y = H / 2 + Math.sin(ang) * r * 0.8;
    return {
      id: m.id,
      name: m.name,
      color: TONES[((m.tone ?? 1) - 1) % 4],
      x,
      y,
      // the name sits on the outward edge of the ring, so three of them never collide
      lx: x + Math.cos(ang) * 104,
      ly: y + Math.sin(ang) * 104 + (Math.sin(ang) < 0 ? -14 : 20),
    };
  });

  const shared = merged.everyone.slice(0, 3);
  const splits = merged.splits.slice(0, 2);
  const unknown = state ? (seated[0] && state.palates[seated[0].id] ? rankMenu(state.palates[seated[0].id], dishes, state.known) : []).filter((s) => s.status === 'unknown') : [];

  const scoreLine = (scores: Record<string, number>) => seated.map((m) => scores[m.id]).filter((n) => typeof n === 'number').join(' / ');

  return (
    <div className="app-pal">
      <StagePage
        side={
          <>
            <Label>
              table {code ?? '·····'} · {header?.name ?? 'no menu yet'}
              {state?.menuAt ? ` · ${clockOf(state.menuAt)}` : ''}
            </Label>
            <H3>
              {seated.length} {seated.length === 1 ? 'palate' : 'palates'}, {shared.length}{' '}
              {shared.length === 1 ? 'shared dish' : 'shared dishes'}
            </H3>
            <Body>
              {shared.length
                ? `${listOf(shared.map((r) => r.dish.name))} score above 75 for everyone at this table.`
                : 'Nothing clears 75 for everyone yet.'}{' '}
              {splits.length ? `${splits[0].dish.name} splits the table.` : ''}{' '}
              {unknown.length ? `${unknown[0].dish.name} is grey for all of them.` : ''}
            </Body>
            <Label>ingredient priors</Label>
            <Body>
              An authored ingredient table · {INGREDIENT_COUNT} ingredients, axis weights and allergen tags. No dish
              is lit without a record.
            </Body>
            <div className="foot">
              <Label>models</Label>
              <ModelLadder events={events} />
            </div>
          </>
        }
      >
        <div className="between" style={{ alignItems: 'flex-end' }}>
          <div>
            <Label>palate</Label>
            <H2>the table&apos;s merged palate</H2>
          </div>
          <Pill variant="soft">{merged.blocked.length} blocked · {unknown.length} grey</Pill>
        </div>

        <div className="galaxy" style={{ flex: 1, minHeight: 380 }}>
          <svg viewBox={`0 0 ${W} ${H}`} aria-label="the table's merged flavour map">
            <rect width={W} height={H} fill="#0D0D14" />
            {people.map((p) => (
              <g key={p.id}>
                <circle cx={p.x} cy={p.y} r={130} fill={p.color} fillOpacity=".08" stroke={p.color} strokeOpacity=".35" />
                <text
                  x={p.lx}
                  y={p.ly}
                  textAnchor="middle"
                  fontFamily={FONT}
                  fontSize="13"
                  fontWeight="600"
                  fill={p.color}
                >
                  {p.name}
                </text>
              </g>
            ))}

            {shared.map((r, i) => {
              const x = W / 2 - 30 + (i % 2 === 0 ? -14 : 26);
              const y = H / 2 - 24 + i * 38;
              return (
                <g key={r.dish.id}>
                  <circle cx={x} cy={y} r={16} fill="#D6336C" fillOpacity=".25" />
                  <circle cx={x} cy={y} r={7} fill="#D6336C" />
                  <text x={x + 14} y={y + 4} fontFamily={FONT} fontSize="12" fontWeight="600" fill="#F0F0F8">
                    {r.dish.name} · {scoreLine(r.scores)}
                  </text>
                </g>
              );
            })}

            {splits.map((r, i) => (
              <g key={r.dish.id}>
                <circle cx={30} cy={84 + i * 30} r={6} fill="#F59E0B" />
                <text x={42} y={88 + i * 30} fontFamily={FONT} fontSize="12" fontWeight="600" fill="#F0F0F8">
                  {r.dish.name} · {scoreLine(r.scores)} · {nameOf(r.lowest)} lowest
                </text>
              </g>
            ))}

            {merged.blocked.slice(0, 1).map((b) => (
              <g key={b.dish.id}>
                <circle cx={30} cy={H - 44} r={6} fill="#EF4444" />
                <text x={42} y={H - 40} fontFamily={FONT} fontSize="12" fontWeight="500" fill="#B0B0CC">
                  {b.dish.name} · never for {nameOf(b.by)} ({b.allergen})
                </text>
              </g>
            ))}

            {unknown.slice(0, 1).map((s) => (
              <g key={s.dish.id}>
                <circle cx={30} cy={H - 18} r={5} fill="#6A6A88" />
                <text x={42} y={H - 14} fontFamily={FONT} fontSize="12" fontWeight="500" fill="#8A8AA6">
                  {s.dish.name} · unknown
                </text>
              </g>
            ))}
          </svg>
        </div>

        <Body>
          {dishes.length} dishes read · {merged.everyone.length} for everyone · {merged.splits.length} split ·{' '}
          {merged.blocked.length} blocked · version {doc?.version ?? 0}
        </Body>
      </StagePage>
    </div>
  );
}
