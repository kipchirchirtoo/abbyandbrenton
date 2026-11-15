import { requireAdminPage } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type Gift = {
  id: string;
  amount: number;
  phone_masked: string;
  giver_name: string | null;
  status: string;
  mpesa_receipt: string | null;
  result_desc: string | null;
  created_at: string;
  wedding_guests: { full_name: string } | { full_name: string }[] | null;
};

export default async function GiftsPage() {
  await requireAdminPage();
  const { data, error } = await getAdminClient()
    .from('wedding_gifts')
    .select('id,amount,phone_masked,giver_name,status,mpesa_receipt,result_desc,created_at,wedding_guests(full_name)')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error('Could not load gifts.');
  const gifts = (data ?? []) as unknown as Gift[];
  const received = gifts.filter((g) => g.status === 'success');
  const total = received.reduce((n, g) => n + g.amount, 0);
  const guestName = (g: Gift) => (Array.isArray(g.wedding_guests) ? g.wedding_guests[0] : g.wedding_guests)?.full_name;

  return (
    <>
      <h1>M-Pesa gifts</h1>
      <div className="stats">
        <div><b>KES {total.toLocaleString('en-KE')}</b><span>Received</span></div>
        <div><b>{received.length}</b><span>Successful gifts</span></div>
        <div><b>{gifts.filter((g) => g.status === 'pending').length}</b><span>Pending prompts</span></div>
      </div>
      <div className="admin-card table-wrap">
        <p className="hint">
          Only gifts made through the on-site M-Pesa prompt appear here. Money sent directly to the phone number is not tracked.
          Phone numbers are stored masked.
        </p>
        <table>
          <thead><tr><th>When</th><th>From</th><th>Phone</th><th>Amount</th><th>Status</th><th>Receipt</th></tr></thead>
          <tbody>
            {gifts.length === 0 && <tr><td colSpan={6} className="hint">No gifts yet.</td></tr>}
            {gifts.map((g) => (
              <tr key={g.id}>
                <td>{new Date(g.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' })}</td>
                <td>{g.giver_name || guestName(g) || '—'}</td>
                <td>{g.phone_masked}</td>
                <td>KES {g.amount.toLocaleString('en-KE')}</td>
                <td><span className={`pill ${g.status === 'success' ? 'accepted' : g.status === 'pending' ? 'pending' : 'declined'}`}>{g.status}</span></td>
                <td>{g.mpesa_receipt || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
