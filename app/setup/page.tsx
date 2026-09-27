import { headers } from 'next/headers';
import { baseUrl, envPresence } from '@/lib/env';

export const dynamic = 'force-dynamic';

function Row({ label, ok, note }: { label: string; ok: boolean; note: string }) {
  return (
    <tr>
      <td style={{ width: 220 }}>
        <strong>{label}</strong>
      </td>
      <td style={{ width: 110 }}>
        <span className={`pill ${ok ? 'solid' : 'plain'}`}>{ok ? 'set' : 'missing'}</span>
      </td>
      <td className="muted small">{note}</td>
    </tr>
  );
}

export default async function SetupPage() {
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const origin = baseUrl(`https://${host}`);
  const p = envPresence();

  return (
    <main className="shell narrow" id="main" style={{ paddingTop: 60 }}>
      <p className="label">Fenora Content Desk</p>
      <h1 style={{ marginTop: 8 }}>One step before this desk will open</h1>
      <p className="lede" style={{ marginTop: 10, maxWidth: '62ch' }}>
        The desk can post to your social accounts, so it stays locked until it has a password. Add
        it in Vercel and redeploy — about a minute of work.
      </p>

      <div className="section">
        <div className="section-head">
          <h2>1. Set a password</h2>
        </div>
        <ol className="lede" style={{ marginTop: 14, paddingLeft: 20 }}>
          <li>
            Open your project on Vercel → <strong>Settings</strong> → <strong>Environment Variables</strong>.
          </li>
          <li>
            Add <code>DESK_PASSWORD</code> with a password of your choosing (any length).
          </li>
          <li>
            Optionally add <code>DESK_SECRET</code> — a long random string. It encrypts the access
            tokens stored in your database.
          </li>
          <li>
            Redeploy (Vercel → Deployments → ⋯ → Redeploy), then reload this page.
          </li>
        </ol>
      </div>

      <div className="section">
        <div className="section-head">
          <h2>2. Everything the desk can use</h2>
        </div>
        <table className="rows" style={{ marginTop: 14 }}>
          <tbody>
            <Row
              label="DESK_PASSWORD"
              ok={p.deskPassword}
              note="Required. Locks the desk; everything else is optional."
            />
            <Row
              label="DESK_SECRET"
              ok={p.deskSecret}
              note="Encrypts stored access tokens with AES-256-GCM and signs the login cookie."
            />
            <Row
              label="Database"
              ok={false}
              note="Vercel → Storage → Upstash Redis or Postgres. Keeps connections, schedule and posted-log between deploys. Without it the desk runs, but forgets on every restart."
            />
            <Row
              label="PUBLIC_BASE_URL"
              ok={p.publicBaseUrl}
              note={`Optional. Instagram fetches the card from a public URL; Vercel supplies this automatically on the production domain.`}
            />
            <Row
              label="META_APP_ID / SECRET"
              ok={p.metaApp}
              note="Lets Settings → Connect Facebook & Instagram run Meta's sign-in for you."
            />
            <Row
              label="LINKEDIN_CLIENT_ID / SECRET"
              ok={p.linkedinApp}
              note="Lets Settings → Connect LinkedIn run LinkedIn's sign-in for you."
            />
            <Row
              label="CRON_SECRET"
              ok={p.cronSecret}
              note="Optional. Enables the daily cron that publishes anything due, if you switch auto-publishing on."
            />
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-head">
          <h2>3. Redirect URIs to register in the apps</h2>
        </div>
        <p className="lede" style={{ marginTop: 12 }}>
          If you connect with OAuth rather than pasting a token, these are the two URLs to paste into
          the Meta app and the LinkedIn app:
        </p>
        <pre className="code" style={{ marginTop: 12 }}>
{`Meta     → Facebook Login → Valid OAuth Redirect URIs
           ${origin}/api/connect/callback/meta

LinkedIn → Auth → Authorized redirect URLs
           ${origin}/api/connect/callback/linkedin`}
        </pre>
        <p className="muted small" style={{ marginTop: 10 }}>
          The redirect URLs must match exactly, including https and any custom domain.
        </p>
      </div>
    </main>
  );
}
