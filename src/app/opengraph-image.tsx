import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

// Node runtime so we can read the committed brand assets off disk and inline them
// as data URIs — Satori can't decode the site's .webp hero, so a pre-built JPEG
// (public/images/og-capitol.jpg, generated from ky-capitol-hero.webp) is used.
export const runtime = 'nodejs';
export const alt =
  'Know Your Vote Kentucky — find your Kentucky lawmakers, track bills, and get notified when legislation moves';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const capitolUri = `data:image/jpeg;base64,${readFileSync(
  join(process.cwd(), 'public/images/og-capitol.jpg'),
).toString('base64')}`;
const logoUri = `data:image/png;base64,${readFileSync(
  join(process.cwd(), 'public/branding/icon-512.png'),
).toString('base64')}`;

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ position: 'relative', display: 'flex', width: '100%', height: '100%' }}>
        {/* Capitol photo (matches the homepage hero) */}
        <img
          src={capitolUri}
          alt=""
          width={size.width}
          height={size.height}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
        {/* Slate → brand-blue scrim: dark at left where the copy sits, verified for white-text contrast */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background:
              'linear-gradient(105deg, rgba(11,37,69,0.92) 0%, rgba(15,23,42,0.70) 55%, rgba(30,58,138,0.60) 100%)',
          }}
        />
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            padding: 64,
            color: '#FFFFFF',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Brand lockup — logo on a white tile so the blue mark reads over the blue scrim */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 68,
                height: 68,
                borderRadius: 16,
                background: '#FFFFFF',
                boxShadow: '0 2px 10px rgba(11,37,69,0.35)',
              }}
            >
              <img src={logoUri} alt="" width={48} height={48} />
            </div>
            <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: 0.2 }}>
              Know Your Vote Kentucky
            </span>
          </div>

          {/* Tagline (mirrors the homepage hero) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1000 }}>
            <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.02, letterSpacing: -1.5 }}>
              Your vote doesn&apos;t stop at the ballot box.
            </div>
            <div style={{ fontSize: 32, lineHeight: 1.3, opacity: 0.94, maxWidth: 900 }}>
              Find your Kentucky lawmakers, track bills, and get notified when legislation moves.
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 26, opacity: 0.85 }}>
              Bills · Members · Committees · Meetings
            </span>
            <span
              style={{
                display: 'flex',
                fontSize: 26,
                fontWeight: 700,
                padding: '10px 22px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.38)',
              }}
            >
              kyvky.com
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
