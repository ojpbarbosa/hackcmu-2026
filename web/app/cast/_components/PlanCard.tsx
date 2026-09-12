'use client';
import { Icon } from '@/ui';
import type { CastPlan } from '@/lib/apps/cast';
import { whenLabel, type Person } from './model';

/** The plan on the line: map thumb, venue, when, and who picks the room. */
export function PlanCard({ plan, picker }: { plan: CastPlan; picker: Person }) {
  return (
    <div className="plan">
      <div className="map">
        <div className="pin" />
      </div>
      <div className="in">
        <p className="ttl">{plan.venue}</p>
        <p className="sub" style={{ marginTop: 4 }}>
          {plan.subtitle}
        </p>
        <div className="divider" style={{ margin: '12px 0' }} />
        <div className="between" style={{ gap: 10 }}>
          <div className="row2" style={{ gap: 8 }}>
            <span style={{ color: 'var(--t3)', display: 'inline-flex' }}>
              <Icon name="cal" size={16} className="sm" />
            </span>
            <span className="h4" style={{ fontSize: 15 }}>
              {whenLabel(plan.whenISO)}
            </span>
          </div>
          <span className="chip">
            <span
              className={`avatar p${picker.tone}`}
              style={{ width: 20, height: 22, fontSize: 9, borderWidth: 1.5 }}
            >
              {picker.name.slice(0, 1).toUpperCase()}
            </span>
            {picker.name} picks the room
          </span>
        </div>
      </div>
    </div>
  );
}
