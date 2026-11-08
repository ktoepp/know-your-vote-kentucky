import { ImageResponse } from 'next/og';
import {
  KY_2026_ELECTION,
  KY_2026_SEAT_CHANGES,
  compositionAfter,
  type KyElectionParty,
} from '@/lib/ky-2026-election-seat-changes';

/**
 * Share card for the 2026 seats-changed-party guide: the headline count plus each
 * chamber's party balance after the election, as split bars. Rendered once at build.
 */

export const alt =
  'Kentucky legislative seats that changed party in 2026: House and Senate seats held by each party before and after the election';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const COLOR: Record<KyElectionParty, string> = { Democratic: '#4338CA', Republican: '#BE123C' };

function ChamberBar({ chamber }: { chamber: 'house' | 'senate' }) {
  const after = compositionAfter(chamber);
  const before = KY_2026_ELECTION.compositionBefore[chamber];
  const total = after.Democratic + after.Republican;
  const label = chamber === 'house' ? 'House' : 'Senate';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 24, flexShrink: 0 }}>
      <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: '#0F172A' }}>{label}</div>
      <div style={{ display: 'flex', height: 34, marginTop: 8, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', width: `${(after.Democratic / total) * 100}%`, background: COLOR.Democratic }} />
        <div style={{ display: 'flex', width: 4, background: '#F8FAFC' }} />
        <div style={{ display: 'flex', flex: 1, background: COLOR.Republican }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 26, color: '#334155' }}>
        <div style={{ display: 'flex' }}>{`${after.Democratic} Democratic, up from ${before.Democratic}`}</div>
        <div style={{ display: 'flex' }}>{`${after.Republican} Republican, down from ${before.Republican}`}</div>
      </div>
    </div>
  );
}

export default function Image() {
  const onBallot = KY_2026_ELECTION.seatsOnBallot.house + KY_2026_ELECTION.seatsOnBallot.senate;
  const unofficial = KY_2026_ELECTION.resultsStatus === 'unofficial';
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#F8FAFC',
          padding: '48px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: '#184D8F' }}>Know Your Vote Kentucky</div>
        <div style={{ display: 'flex', flexShrink: 0, fontSize: 52, fontWeight: 700, color: '#0F172A', lineHeight: 1.15, marginTop: 12 }}>
          Kentucky legislative seats that changed party in 2026
        </div>
        <div style={{ display: 'flex', flexShrink: 0, fontSize: 28, color: '#334155', marginTop: 14 }}>
          {`${KY_2026_SEAT_CHANGES.length} of ${onBallot} seats on the ballot changed party.${unofficial ? ' Unofficial results.' : ''}`}
        </div>
        <ChamberBar chamber="house" />
        <ChamberBar chamber="senate" />
      </div>
    ),
    size,
  );
}
