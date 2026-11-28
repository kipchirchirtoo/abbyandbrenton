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
  merchant_request_id: string | null;
  checkout_request_id: string | null;
  created_at: string;
  wedding_guests: { full_name: string } | { full_name: string }[] | null;
};

export default async function GiftsPage() {
  await requireAdminPage();
  const { data, error } = await getAdminClient()
    .from('wedding_gifts')
    .select('id,amount,phone_masked,giver_name,status,mpesa_receipt,result_desc,merchant_request_id,checkout_request_id,created_at,wedding_guests(full_name)')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error('Could not load gifts.');
  const gifts = (data ?? []) as unknown as Gift[];
  const received = gifts.filter((g) => g.status === 'success');
  const total = received.reduce((n, g) => n + g.amount, 0);

  const paystackGifts = received.filter((g) => g.merchant_request_id === 'paystack' || g.checkout_request_id?.startsWith('GF-'));
  const paystackTotal = paystackGifts.reduce((n, g) => n + g.amount, 0);

  const mpesaGifts = received.filter((g) => g.merchant_request_id !== 'paystack' && !g.checkout_request_id?.startsWith('GF-'));
  const mpesaTotal = mpesaGifts.reduce((n, g) => n + g.amount, 0);

  const guestName = (g: Gift) => (Array.isArray(g.wedding_guests) ? g.wedding_guests[0] : g.wedding_guests)?.full_name;

  return (
    <>
      <h1>Wedding Gifts</h1>
      <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div><b>KES {total.toLocaleString('en-KE')}</b><span>Total Received</span></div>
        <div><b>KES {paystackTotal.toLocaleString('en-KE')}</b><span>Paystack ({paystackGifts.length})</span></div>
        <div><b>KES {mpesaTotal.toLocaleString('en-KE')}</b><span>M-Pesa ({mpesaGifts.length})</span></div>
        <div><b>{gifts.filter((g) => g.status === 'pending').length}</b><span>Pending</span></div>
      </div>
      <div className="admin-card table-wrap">
        <p className="hint">
          Contributions processed through Paystack (Cards, Bank Transfer, Apple Pay) and on-site M-Pesa appear here.
          Direct transfers outside the platform are not tracked.
        </p>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Channel</th>
              <th>From</th>
              <th>Contact</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Receipt / Ref</th>
              <th>Wish / Note</th>
            </tr>
          </thead>
          <tbody>
            {gifts.length === 0 && <tr><td colSpan={8} className="hint">No gifts received yet.</td></tr>}
            {gifts.map((g) => {
              const isPaystack = g.merchant_request_id === 'paystack' || g.checkout_request_id?.startsWith('GF-');
              return (
                <tr key={g.id}>
                  <td>{new Date(g.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' })}</td>
                  <td>
                    <span
                      className="pill accepted"
                      style={{
                        background: isPaystack ? '#0ba4db' : '#00a859',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.72rem',
                      }}
                    >
                      {isPaystack ? 'Paystack' : 'M-Pesa'}
                    </span>
                  </td>
                  <td>{g.giver_name || guestName(g) || '—'}</td>
                  <td>{g.phone_masked}</td>
                  <td><b>KES {g.amount.toLocaleString('en-KE')}</b></td>
                  <td>
                    <span className={`pill ${g.status === 'success' ? 'accepted' : g.status === 'pending' ? 'pending' : 'declined'}`}>
                      {g.status}
                    </span>
                  </td>
                  <td><code style={{ fontSize: '0.78rem' }}>{g.mpesa_receipt || g.checkout_request_id || '—'}</code></td>
                  <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={g.result_desc || ''}>
                    {g.result_desc || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
