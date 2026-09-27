import Link from 'next/link';
import LogoutButton from './LogoutButton';

export default function TopBar({ current }: { current: 'desk' | 'settings' }) {
  return (
    <header className="top">
      <Link href="/" className="brand">
        Fenora <span>Content Desk</span>
      </Link>
      <nav className="nav">
        <Link href="/" aria-current={current === 'desk' ? 'page' : undefined}>
          Desk
        </Link>
        <Link href="/settings" aria-current={current === 'settings' ? 'page' : undefined}>
          Settings
        </Link>
      </nav>
      <LogoutButton />
    </header>
  );
}
