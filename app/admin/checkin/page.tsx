import { requireAdminPage } from '@/lib/admin-auth';
import { isWellFormedQr } from '@/lib/rsvp/qr';
import Scanner from './Scanner';

export const dynamic = 'force-dynamic';

export default async function CheckInPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  await requireAdminPage();
  const { code } = await searchParams;
  return (
    <>
      <h1>Wedding-day check-in</h1>
      <Scanner initialCode={isWellFormedQr(code) ? code : undefined} />
    </>
  );
}
