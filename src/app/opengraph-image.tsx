import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Know Your Vote Kentucky — Track Kentucky legislation, representatives, and civic engagement';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: 'linear-gradient(135deg, #0B2545 0%, #13315C 55%, #1B4965 100%)',
          color: '#FFFFFF',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 28, opacity: 0.85 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: '#F2C14E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0B2545',
              fontWeight: 800,
              fontSize: 28,
            }}
          >
            KY
          </div>
          <span style={{ letterSpacing: 0.5 }}>kyvky.com</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 80, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1 }}>
            Know Your Vote Kentucky
          </div>
          <div style={{ fontSize: 36, lineHeight: 1.25, opacity: 0.9, maxWidth: 980 }}>
            Track Kentucky legislation, representatives, and civic engagement.
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 24, opacity: 0.7 }}>
          Bills · Members · Committees · Meetings
        </div>
      </div>
    ),
    { ...size },
  );
}
