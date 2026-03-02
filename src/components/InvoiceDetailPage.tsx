import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TopNav from './TopNav'

interface InvoiceItem {
  itemName: string
  description: string
  qty: number
  price: number
  account: string
  taxRate: string
  amount: number
  backordered?: boolean
}

interface HistoryEntry {
  id: number
  date: string
  message: string
  type: 'allocation' | 'note'
}

interface Invoice {
  id: number
  number: string
  ref: string
  to: string
  date: string
  dueDate: string
  paid: number
  due: number
  status: string
  sent: boolean
  items: InvoiceItem[]
  history?: HistoryEntry[]
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then(r => r.json())
      .then(data => { setInvoice(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f4f5f6' }}>
        <TopNav activePage="invoices" />
        <div style={{ padding: 40, color: '#888', fontSize: 13 }}>Loading...</div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f4f5f6' }}>
        <TopNav activePage="invoices" />
        <div style={{ padding: 40, color: '#888', fontSize: 13 }}>Invoice not found.</div>
      </div>
    )
  }

  const items = invoice.items || []
  const subtotal = items.reduce((s, i) => s + i.amount, 0) || invoice.due / 1.15
  const totalGST = subtotal * 0.15
  const total = subtotal + totalGST

  const backorderedItems = items.filter(i => i.backordered)
  const allocatedItemNames = new Set((invoice.history || []).filter(h => h.type === 'allocation').map(h => {
    const match = h.message.match(/\+\d+ (.+) automatically/)
    return match ? match[1] : ''
  }))
  const allAllocated = backorderedItems.length > 0 && backorderedItems.every(i => allocatedItemNames.has(i.itemName))

  const statusColor = invoice.status === 'Paid'
    ? { bg: '#d4edda', text: '#276438' }
    : invoice.status === 'Draft'
    ? { bg: '#f0f0f0', text: '#555' }
    : { bg: '#d4edda', text: '#276438' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f4f5f6' }}>
      <TopNav activePage="invoices" />

      <div style={{ background: '#fff', borderBottom: '1px solid #e3e5e8', padding: '8px 24px 0' }}>
        <div style={{ fontSize: 12, color: '#0078C8', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/invoices')}>Sales overview</span>
          <span style={{ color: '#aaa' }}>›</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/invoices')}>Invoices</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{invoice.number}</h1>
            <span style={{ background: statusColor.bg, color: statusColor.text, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 3 }}>
              {invoice.status}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', fontSize: 13, color: '#333' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="4"/><circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/></svg>
              Preview
            </button>
            <div style={{ display: 'flex' }}>
              <button style={{ background: 'none', border: '1px solid #ccc', borderRight: 'none', borderRadius: '4px 0 0 4px', padding: '5px 12px', cursor: 'pointer', fontSize: 13, color: '#333' }}>Print PDF</button>
              <button style={{ background: 'none', border: '1px solid #ccc', borderRadius: '0 4px 4px 0', padding: '5px 6px', cursor: 'pointer', color: '#333' }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5l3 3 3-3"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex' }}>
              <button style={{ background: '#0078C8', color: '#fff', border: 'none', borderRadius: '4px 0 0 4px', padding: '5px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Add Payment</button>
              <button style={{ background: '#006aaf', color: '#fff', border: 'none', borderRadius: '0 4px 4px 0', padding: '5px 8px', cursor: 'pointer' }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5l3 3 3-3"/></svg>
              </button>
            </div>
            <button style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '5px 8px', cursor: 'pointer', color: '#333' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="7" cy="3" r="1"/><circle cx="7" cy="7" r="1"/><circle cx="7" cy="11" r="1"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: 1000, width: '100%', margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 4, border: '1px solid #e3e5e8', padding: '20px 24px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
            <input type="checkbox" id="sent" defaultChecked={invoice.sent} style={{ cursor: 'pointer' }} />
            <label htmlFor="sent" style={{ fontSize: 13, cursor: 'pointer' }}>Sent</label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
            {[
              { label: 'To', value: invoice.to, blue: true },
              { label: 'Issue date', value: invoice.date },
              { label: 'Due date', value: invoice.dueDate },
              { label: 'Invoice number', value: invoice.number },
            ].map(({ label, value, blue }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, color: blue ? '#0078C8' : '#1a1a1a', fontWeight: blue ? 500 : 400 }}>{value}</div>
              </div>
            ))}
          </div>

          {invoice.ref && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Reference</div>
              <div style={{ fontSize: 13, color: '#1a1a1a' }}>{invoice.ref}</div>
            </div>
          )}

          <div style={{ textAlign: 'right', fontSize: 12, color: '#555', marginBottom: 12 }}>Amounts are tax inclusive</div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e3e5e8' }}>
                {['Item/description', 'Qty', 'Price', 'Tax amount', 'Amount'].map((h, i) => (
                  <th key={h} style={{ padding: '8px', textAlign: i === 0 ? 'left' : 'right', fontSize: 12, fontWeight: 500, color: '#555' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? items.map((row, i) => {
                const taxAmt = row.qty * row.price * 0.15
                const lineTotal = row.qty * row.price + taxAmt
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{row.itemName}{row.description ? ` - ${row.description}` : ''}</div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                        {row.account && `Account ${row.account}`}{row.account && row.taxRate && ' · '}{row.taxRate && `Tax rate: ${row.taxRate}`}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13 }}>{row.qty}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13 }}>{row.price.toFixed(2)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13 }}>{taxAmt.toFixed(2)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13, fontWeight: 500 }}>{lineTotal.toFixed(2)}</td>
                  </tr>
                )
              }) : (
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#888' }}>—</div>
                  </td>
                  <td /><td /><td />
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13, fontWeight: 500 }}>
                    {invoice.due.toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <div style={{ width: 260 }}>
              {items.length > 0 ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                    <span style={{ color: '#555' }}>Subtotal</span><span>{subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13 }}>
                    <span style={{ color: '#555' }}>Total GST</span><span>{totalGST.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #e3e5e8', fontSize: 15, fontWeight: 700 }}>
                    <span>Total</span><span>{total.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                    <span style={{ color: '#555' }}>Paid</span><span>{invoice.paid.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #e3e5e8', fontSize: 15, fontWeight: 700 }}>
                    <span>Due</span><span>{invoice.due.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#333' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 10h8M6 7V2M4 4l2-2 2 2"/></svg>
              Attach files
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5l3 3 3-3"/></svg>
            </button>
          </div>
        </div>

        <HistorySection history={invoice.history || []} allAllocated={allAllocated} />
      </div>
    </div>
  )
}

function HistorySection({ history, allAllocated }: { history: HistoryEntry[]; allAllocated: boolean }) {
  const [open, setOpen] = useState(true)

  return (
    <div style={{ background: '#fff', borderRadius: 4, border: '1px solid #e3e5e8', marginTop: 8 }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d={open ? 'M2 4.5l4 4 4-4' : 'M2 7.5l4-4 4 4'} />
          </svg>
          <span style={{ fontWeight: 500, fontSize: 13 }}>History and notes</span>
          {history.length > 0 && (
            <span style={{ background: '#e8f4ff', color: '#0078C8', fontSize: 11, fontWeight: 600, borderRadius: 10, padding: '1px 7px' }}>
              {history.length}
            </span>
          )}
        </div>
        <button
          onClick={e => e.stopPropagation()}
          style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontSize: 12, color: '#333' }}
        >
          Add note
        </button>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid #f0f0f0' }}>
          {allAllocated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#f0faf4', borderBottom: '1px solid #c8ecd6' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6.5" fill="#28a745" />
                <path d="M4 7l2.5 2.5L10 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 13, color: '#1a6632', fontWeight: 500 }}>
                All backordered items have been allocated to this invoice
              </span>
            </div>
          )}

          {history.length === 0 ? (
            <div style={{ padding: '16px', fontSize: 13, color: '#888', textAlign: 'center' }}>
              No history yet
            </div>
          ) : (
            [...history].reverse().map(entry => (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', borderBottom: '1px solid #f5f5f5' }}>
                {entry.type === 'allocation' ? (
                  <div style={{ marginTop: 1, width: 20, height: 20, borderRadius: '50%', background: '#e8f4e8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M5 1v8M2 5l3-3 3 3" stroke="#28a745" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                ) : (
                  <div style={{ marginTop: 1, width: 20, height: 20, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#666" strokeWidth="1.5">
                      <path d="M1 2h8M1 5h6M1 8h4" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: entry.type === 'allocation' ? '#1a6632' : '#1a1a1a', fontWeight: entry.type === 'allocation' ? 500 : 400 }}>
                    {entry.message}
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{entry.date}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
