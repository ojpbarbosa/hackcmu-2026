'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Screen, TopNav, Pill, Chip, Card, CTA, Icon, H1, H2, Body, BodySm, Label, Sub } from '@/ui';
import { gotAway, sharedKeywords } from '@/lib/apps/familiars';
import { MatchRing } from '../_components/MatchRing';
import { useFamiliars, withRoom } from '../_components/useFamiliars';

export default function AwayPage() {
  const router = useRouter();
  const { code, state, me } = useFamiliars();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (state && !me) router.replace(withRoom('/familiars', code));
  }, [state, me, code, router]);

  const away = useMemo(() => (state && me ? gotAway(state, me.id) : null), [state, me]);
  const them = away && state ? (state.familiars[away.id] ?? null) : null;
  const shared = me && them ? sharedKeywords(me, them) : [];
  const theirCluster = them ? state?.clusters.find((c) => c.id === them.clusterId) : null;
  const sameCluster = !!(me && them && me.clusterId && me.clusterId === them.clusterId);

  return (
    <Screen app="fam" className="col">
      <TopNav
        left={
          <button type="button" className="back" aria-label="back" onClick={() => router.back()}>
            <Icon name="chev-l" />
          </button>
        }
        title="The one that got away"
        right={<Pill variant="soft" icon="eye-off">{code ?? '…'}</Pill>}
      />

      <div className="pad col" style={{ gap: 18, marginTop: 22, flex: 1 }}>
        {them && away ? (
          <>
            <div className="match">
              <MatchRing pct={away.score} letter="?" />
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <H2>
                  {them.name} · address <span style={{ textTransform: 'none' }}>{them.address}</span>
                </H2>
                <Sub>
                  never bumped · last seen {them.human.seat || 'somewhere in this room'}
                  {them.demo ? ' · demo villager' : ''}
                </Sub>
              </div>
            </div>

            <Card className="col">
              <Label>what you share</Label>
              <div className="chips" style={{ marginTop: 10 }}>
                {shared.length ? (
                  shared.map((k) => (
                    <Chip key={k} on>
                      {k}
                    </Chip>
                  ))
                ) : (
                  <Chip>nothing on paper</Chip>
                )}
                {them.keywords
                  .filter((k) => !shared.includes(k))
                  .slice(0, 3)
                  .map((k) => (
                    <Chip key={k}>{k}</Chip>
                  ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <Body>
                  They answered &ldquo;{them.seeds[0]}&rdquo; where you answered &ldquo;{me?.seeds[0]}&rdquo;.{' '}
                  {sameCluster
                    ? `Same cluster (${theirCluster?.label ?? 'yours'}), opposite corners of the room, all night.`
                    : `They sit in ${theirCluster?.label ?? 'another cluster'} and you never crossed.`}
                </Body>
              </div>
            </Card>

            {revealed ? (
              <div
                className="pill"
                style={{ background: 'var(--mint)', color: 'var(--mint-ink)', height: 'auto', padding: '12px 16px', boxShadow: 'none' }}
              >
                <Icon name="pin" size={16} className="sm" />
                {them.human.name} · {them.human.seat || 'ask the room'}
              </div>
            ) : null}
          </>
        ) : (
          <div className="col" style={{ gap: 10 }}>
            <H1>nobody got away</H1>
            <Body>
              You bumped everyone this room has to offer, or the room is still filling up. Come back after a few more
              people hatch.
            </Body>
          </div>
        )}
      </div>

      <div className="bottom">
        {them ? (
          <CTA variant="grad" icon="pin" onClick={() => setRevealed(true)} disabled={revealed}>
            {revealed ? `${them.human.name} is ${them.human.seat || 'in this room'}` : 'Find them now'}
          </CTA>
        ) : (
          <CTA variant="grad" icon="phone" href={withRoom('/familiars/bump', code)}>
            Bump another phone
          </CTA>
        )}
        <CTA variant="ghost" onClick={() => router.push(withRoom('/familiars/me', code))}>
          Maybe tomorrow
        </CTA>
        {them ? <BodySm>{`${Math.round((away?.score ?? 0) * 100)}% like you, and you never met`}</BodySm> : null}
      </div>
    </Screen>
  );
}
