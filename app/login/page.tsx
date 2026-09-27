import { Suspense } from 'react';
import LoginForm from '@/components/LoginForm';
import { envPresence } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const presence = envPresence();
  return (
    <main className="shell narrow" id="main" style={{ maxWidth: 420, paddingTop: 96 }}>
      <div className="brand" style={{ marginBottom: 28 }}>
        Fenora <span>Content Desk</span>
      </div>
      {presence.deskPassword ? (
        <Suspense fallback={<p className="muted small">Loading…</p>}>
          <LoginForm />
        </Suspense>
      ) : (
        <div className="banner">
          <div className="grow">
            This desk has no password set, so it will stay shut on Vercel. Add{' '}
            <code>DESK_PASSWORD</code> in Project → Settings → Environment Variables, then redeploy.
          </div>
        </div>
      )}
    </main>
  );
}
