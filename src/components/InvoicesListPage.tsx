import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNav from './TopNav'

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
}

type TabKey = 'All' | 'Draft' | 'Awaiting Approval' | 'Awaiting Payment' | 'Paid' | 'Repeating'

export default function InvoicesListPage() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    fetch('/api/invoices').then(r => r.json()).then(setInvoices)
  }, [])

  const counts = {
    'Draft': invoices.filter(i => i.status === 'Draft').length,
    'Awaiting Approval': invoices.filter(i => i.status === 'Awaiting Approval').length,
    'Awaiting Payment': invoices.filter(i => i.status === 'Awaiting Payment').length,
    'Paid': invoices.filter(i => i.status === 'Paid').length,
    'Repeating': invoices.filter(i => i.status === 'Repeating').length,
  }

  const filtered = invoices.filter(inv => {
    const matchesTab = activeTab === 'All' || inv.status === activeTab
    const q = searchQuery.toLowerCase()
    const matchesSearch = !q ||
      inv.number.toLowerCase().includes(q) ||
      inv.to.toLowerCase().includes(q) ||
      inv.ref.toLowerCase().includes(q)
    return matchesTab && matchesSearch
  })

  const tabs: TabKey[] = ['All', 'Draft', 'Awaiting Approval', 'Awaiting Payment', 'Paid', 'Repeating']

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f4f5f6' }}>
      <TopNav activePage="invoices" />

      <div style={{ background: '#fff', padding: '16px 32px 0', borderBottom: '1px solid #e3e5e8' }}>
        <div style={{ fontSize: 12, color: '#0078C8', marginBottom: 6, cursor: 'pointer' }}>
          Sales overview ›
        </div>
        <h1 style={{ margin: '0 0 16px', fontSize: 24, fontWeight: 600, color: '#1a1a1a' }}>Invoices</h1>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex' }}>
            <button
              onClick={() => navigate('/invoice')}
              style={{ background: '#fff', border: '1px solid #ccc', borderRight: 'none', borderRadius: '4px 0 0 4px', padding: '5px 12px', cursor: 'pointer', fontSize: 13, color: '#333', fontWeight: 500 }}
            >
              New Invoice
            </button>
            <button style={{ background: '#fff', border: '1px solid #ccc', borderRadius: '0 4px 4px 0', padding: '5px 8px', cursor: 'pointer', color: '#333' }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5l3 3 3-3"/></svg>
            </button>
          </div>
          {['New Repeating Invoice', 'New Credit Note', 'Send Statements', 'Import', 'Export'].map(label => (
            <button key={label} style={{ background: '#fff', border: '1px solid #ccc', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', fontSize: 13, color: '#333' }}>
              {label}
            </button>
          ))}
          <button style={{ background: '#fff', border: '1px solid #ccc', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', fontSize: 13, color: '#333', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#999', display: 'inline-block' }} />
            Invoice Reminders: Off
          </button>
          <button style={{ background: '#fff', border: '1px solid #ccc', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', fontSize: 13, color: '#333' }}>
            Online Payments
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex' }}>
          {tabs.map(tab => {
            const count = tab !== 'All' && tab !== 'Repeating' ? counts[tab as keyof typeof counts] : null
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #1a1a1a' : '2px solid transparent',
                  padding: '8px 14px',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: isActive ? '#1a1a1a' : '#555',
                  fontWeight: isActive ? 600 : 400,
                  marginBottom: -1,
                  whiteSpace: 'nowrap',
                }}
              >
                {tab}{count !== null ? ` (${count})` : ''}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table area */}
      <div style={{ padding: '16px 32px', flex: 1 }}>
        <div style={{ background: '#fff', border: '1px solid #e3e5e8', borderRadius: 4 }}>
          {/* Table toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#555', flex: 1 }}>{filtered.length} items</span>
            {showSearch ? (
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                style={{ border: '1px solid #0078C8', borderRadius: 4, padding: '4px 10px', fontSize: 13, outline: 'none', width: 200 }}
                onBlur={() => { if (!searchQuery) setShowSearch(false) }}
              />
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                style={{ background: '#fff', border: '1px solid #ccc', borderRadius: 4, padding: '5px 16px', cursor: 'pointer', fontSize: 13, color: '#333', fontWeight: 500 }}
              >
                Search
              </button>
            )}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e3e5e8', borderTop: '1px solid #f0f0f0' }}>
                <th style={thStyle}>Number</th>
                <th style={thStyle}>Ref</th>
                <th style={{ ...thStyle, width: 28 }}></th>
                <th style={thStyle}>To</th>
                <th style={thStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    Date
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 4l3 3 3-3"/></svg>
                  </span>
                </th>
                <th style={thStyle}>Due Date</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Paid</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Due</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Sent</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: '#888', fontSize: 13 }}>
                    No invoices found
                  </td>
                </tr>
              ) : (
                filtered.map(inv => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer', background: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={tdStyle}>{inv.number}</td>
                    <td style={{ ...tdStyle, color: '#555' }}>{inv.ref}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <svg width="14" height="16" viewBox="0 0 14 16" fill="none" stroke="#ccc" strokeWidth="1.5">
                        <rect x="2" y="1" width="10" height="14" rx="1"/>
                        <path d="M4 6h6M4 9h4"/>
                      </svg>
                    </td>
                    <td style={{ ...tdStyle, color: '#0078C8' }}>{inv.to}</td>
                    <td style={tdStyle}>{inv.date}</td>
                    <td style={tdStyle}>{inv.dueDate}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{inv.paid.toFixed(2)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{inv.due.toFixed(2)}</td>
                    <td style={tdStyle}>
                      <span style={{ color: inv.status === 'Paid' ? '#276438' : '#333' }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {inv.sent && <span style={{ color: '#276438', fontWeight: 500 }}>Sent</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 500,
  color: '#0078C8', background: '#fff',
}
const tdStyle: React.CSSProperties = { padding: '10px 12px', fontSize: 13, color: '#333' }
