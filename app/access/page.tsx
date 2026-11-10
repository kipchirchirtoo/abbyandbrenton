import type { Metadata } from 'next';
import PrivateAccess from '@/components/PrivateAccess';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Private invitation', robots: { index: false, follow: false } };

const reasons = ['invalid', 'revoked', 'expired', 'unavailable'] as const;

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const r = reasons.find((x) => x === reason);
  return <PrivateAccess reason={r} />;
}
