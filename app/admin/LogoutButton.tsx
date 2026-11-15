'use client';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="linklike"
      onClick={async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        router.replace('/admin/login');
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
