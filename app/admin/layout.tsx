import type { Metadata } from 'next';
import Link from 'next/link';
import { isAdmin } from '@/lib/admin-auth';
import LogoutButton from './LogoutButton';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Wedding admin', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await isAdmin();
  return (
    <div className="admin">
      <header className="admin-bar">
        <span className="script">A&amp;B</span>
        {signedIn && (
          <nav>
            <Link href="/admin/guests">Guests</Link>
            <Link href="/admin/invitations">Invitations</Link>
            <Link href="/admin/rsvps">Responses</Link>
            <LogoutButton />
          </nav>
        )}
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
