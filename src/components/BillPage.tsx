import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import TopNav from './TopNav'
import type { InventoryItem } from './InventoryPage'

interface BackorderedItem {
  itemName: string
  qty: number
  backordered?: boolean
}

interface Invoice {
  id: number
  items: BackorderedItem[]
  history?: HistoryEntry[]
}

interface HistoryEntry {
  id: number
  date: string
  message: string
  type: 'allocation' | 'note'
}

interface LineItem {
  id: number
  itemTag: string
  itemName: string
  description: string
  qty: number | ''
  price: number | ''
  account: string
  taxRate: string
  amount: number | ''
}

const emptyRow = (id: number): LineItem => ({
  id, itemTag: '', itemName: '', description: '', qty: '', price: '', account: '', taxRate: '', amount: '',
})

export default function BillPage() {
  const [approved, setApproved] = useState(false)
  const [rows, setRows] = useState<LineItem[]>([emptyRow(1), emptyRow(2)])
  const [catalog, setCatalog] = useState<InventoryItem[]>([])
  const [openDropdownRow, setOpenDropdownRow] = useState<number | null>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [hoveredCatalog, setHoveredCatalog] = useState<number | null>(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRefs = useRef<Record<number, HTMLDivElement | null>>({})

  useEffect(() => {
    fetch('/api/inventory').then(r => r.json()).then(setCatalog)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownRow(null)
        setHoveredCatalog(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function openDropdown(rowId: number) {
    const el = triggerRefs.current[rowId]
    if (el) {
      const rect = el.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX })
    }
    setOpenDropdownRow(rowId)
    setHoveredCatalog(null)
  }

  function selectCatalogItem(rowId: number, item: InventoryItem) {
    setRows(rows.map(r =>
      r.id === rowId
        ? { ...r, itemTag: item.code, itemName: item.name, description: item.description, qty: 1, price: item.costPrice, account: item.account, taxRate: item.taxRate, amount: item.costPrice }
        : r
    ))
    setOpenDropdownRow(null)
    setHoveredCatalog(null)
  }

  function updateRow(rowId: number, field: keyof LineItem, value: string | number) {
    setRows(rows.map(r => {
      if (r.id !== rowId) return r
      const updated = { ...r, [field]: value }
      if (field === 'qty' || field === 'price') {
        const q = field === 'qty' ? Number(value) : Number(r.qty)
        const p = field === 'price' ? Number(value) : Number(r.price)
        updated.amount = isNaN(q * p) ? '' : q * p
      }
      return updated
    }))
  }

  async function addToInventory() {
    const boughtRows = rows.filter(r => r.itemName && r.qty !== '' && Number(r.qty) > 0)

    // Restock inventory
    await Promise.all(boughtRows.map(async row => {
      const inv = catalog.find(i => i.name === row.itemName)
      if (!inv) return
      await fetch(`/api/inventory/${inv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...inv, quantity: inv.quantity + Number(row.qty) }),
      })
    }))

    // Allocate restocked items to any backordered invoices
    const allInvoices: Invoice[] = await fetch('/api/invoices').then(r => r.json())
    const today = new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })

    for (const row of boughtRows) {
      const qtyAdded = Number(row.qty)
      const backorderedInvoices = allInvoices.filter(inv =>
        Array.isArray(inv.items) && inv.items.some((item: BackorderedItem) => item.itemName === row.itemName && item.backordered)
      )
      for (const invoice of backorderedInvoices) {
        const backorderedItem = invoice.items.find((item: BackorderedItem) => item.itemName === row.itemName && item.backordered)
        const allocateQty = Math.min(qtyAdded, backorderedItem.qty)
        const newEntry = {
          id: Date.now() + Math.random(),
          date: today,
          message: `+${allocateQty} ${row.itemName} automatically allocated to this invoice`,
          type: 'allocation' as const,
        }
        const updatedHistory = [...(invoice.history || []), newEntry]
        await fetch(`/api/invoices/${invoice.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ history: updatedHistory }),
        })
      }
    }
  }

  const subtotal = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const totalGST = subtotal * 0.15
  const total = subtotal + totalGST

  // ── Approved read-only view ──────────────────────────────────────────────────
  if (approved) {
    const approvedRows = rows.filter(r => r.itemName)
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f4f5f6' }}>
        <TopNav activePage="invoice" />

        <div style={{ background: '#fff', borderBottom: '1px solid #e3e5e8', padding: '8px 24px 0' }}>
          <div style={{ fontSize: 12, color: '#0078C8', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <span style={{ cursor: 'pointer' }}>Purchases overview</span>
            <span style={{ color: '#aaa' }}>›</span>
            <span style={{ cursor: 'pointer' }}>Bills</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>New Bill</h1>
              <span style={{ background: '#d4edda', color: '#276438', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 3 }}>
                Awaiting payment
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
              <input type="checkbox" id="sent" style={{ cursor: 'pointer' }} />
              <label htmlFor="sent" style={{ fontSize: 13, cursor: 'pointer' }}>Sent</label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
              {[
                { label: 'From', value: 'Supplier', blue: true },
                { label: 'Issue date', value: '11 Apr 2022' },
                { label: 'Due date', value: '11 Apr 2022' },
                { label: 'Reference', value: 'BILL-0001' },
              ].map(({ label, value, blue }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, color: blue ? '#0078C8' : '#1a1a1a' }}>{value}</div>
                </div>
              ))}
            </div>

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
                {approvedRows.map(row => {
                  const qty = Number(row.qty) || 0
                  const price = Number(row.price) || 0
                  const taxAmt = qty * price * 0.15
                  const lineTotal = qty * price + taxAmt
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{row.itemName}{row.description ? ` - ${row.description}` : ''}</div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                          {row.account && `Account ${row.account}`}{row.account && row.taxRate && ' · '}{row.taxRate && `Tax rate: ${row.taxRate}`}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13 }}>{qty}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13 }}>{price.toFixed(2)}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13 }}>{taxAmt.toFixed(1)}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: 13, fontWeight: 500 }}>{lineTotal.toFixed(1)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <div style={{ width: 260 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: '#555' }}>Subtotal</span><span>{subtotal.toFixed(1)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13 }}>
                  <span style={{ color: '#555' }}>Total GST</span><span>{totalGST.toFixed(1)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #e3e5e8', fontSize: 15, fontWeight: 700 }}>
                  <span>Total</span><span>{total.toFixed(1)}</span>
                </div>
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

          <div style={{ background: '#fff', borderRadius: 4, border: '1px solid #e3e5e8', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4.5l4 4 4-4"/></svg>
                <span style={{ fontWeight: 500, fontSize: 13 }}>History and notes</span>
              </div>
              <button style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontSize: 12, color: '#333' }}>Add note</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Draft / editing view ─────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f4f5f6' }}>
      <TopNav activePage="invoice" />

      {/* Page header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e3e5e8', padding: '8px 24px 0' }}>
        <div style={{ fontSize: 12, color: '#0078C8', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <span style={{ cursor: 'pointer' }}>Purchases overview</span>
          <span style={{ color: '#aaa' }}>›</span>
          <span style={{ cursor: 'pointer' }}>Bills</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>New Bill</h1>
            <span style={{ background: '#f0f0f0', color: '#555', fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 3, border: '1px solid #ddd' }}>Draft</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', fontSize: 13, color: '#333' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="4"/><circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/></svg>
              Preview
            </button>
            <div style={{ display: 'flex' }}>
              <button style={{ background: 'none', border: '1px solid #ccc', borderRight: 'none', borderRadius: '4px 0 0 4px', padding: '5px 12px', cursor: 'pointer', fontSize: 13, color: '#333' }}>
                Save &amp; close
              </button>
              <button style={{ background: 'none', border: '1px solid #ccc', borderRadius: '0 4px 4px 0', padding: '5px 6px', cursor: 'pointer', color: '#333' }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5l3 3 3-3"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex' }}>
              <button
                onClick={() => setShowApproveModal(true)}
                style={{ background: '#0078C8', color: '#fff', border: 'none', borderRadius: '4px 0 0 4px', padding: '5px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
              >
                Approve &amp; email
              </button>
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

      {/* Main content */}
      <div style={{ padding: '24px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 4, border: '1px solid #e3e5e8', padding: '20px 20px 0' }}>

          {/* Bill form fields — Contact, Issue date, Due date, Reference only */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 1.5fr', gap: 16, marginBottom: 24 }}>
            <FormField label="Contact">
              <div style={{ border: '1px solid #ccc', borderRadius: 4, height: 32, display: 'flex', alignItems: 'center', paddingLeft: 8, gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#666" strokeWidth="1.5"><circle cx="7" cy="5" r="2.5"/><path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5"/></svg>
              </div>
            </FormField>
            <FormField label="Issue date"><DateInput value="11 Apr 2022" /></FormField>
            <FormField label="Due date"><DateInput value="11 Apr 2022" /></FormField>
            <FormField label="Reference">
              <div style={{ border: '1px solid #ccc', borderRadius: 4, height: 32, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#666" strokeWidth="1.5"><path d="M3 2l6 4-6 4V2z"/></svg>
              </div>
            </FormField>
          </div>

          {/* Show/hide columns + Tax */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 }}>
            <button style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#333' }}>
              Show/hide columns
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#555' }}>Tax</span>
              <SelectField value="Tax exclusive" small />
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 24 }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '26%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: 28 }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: '1px solid #e3e5e8', borderTop: '1px solid #e3e5e8' }}>
                  <th style={thStyle}></th>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>Description</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Qty</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Price</th>
                  <th style={thStyle}>Account</th>
                  <th style={thStyle}>Tax rate</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Amount NZD</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    {/* Drag handle */}
                    <td style={{ ...tdStyle, color: '#ccc', cursor: 'grab', paddingLeft: 4 }}>
                      <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                        <rect x="1" y="2" width="3" height="3" rx="1"/><rect x="6" y="2" width="3" height="3" rx="1"/>
                        <rect x="1" y="6" width="3" height="3" rx="1"/><rect x="6" y="6" width="3" height="3" rx="1"/>
                        <rect x="1" y="10" width="3" height="3" rx="1"/><rect x="6" y="10" width="3" height="3" rx="1"/>
                      </svg>
                    </td>

                    {/* Item cell */}
                    <td style={tdStyle}>
                      <div
                        ref={el => { triggerRefs.current[row.id] = el }}
                        onClick={() => openDropdown(row.id)}
                        style={{ border: openDropdownRow === row.id ? '2px solid #0078C8' : '1px solid #ccc', borderRadius: 4, minHeight: 30, padding: '4px 6px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, background: '#fff' }}
                      >
                        {row.itemTag && (
                          <span style={{ background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 3, fontSize: 10, padding: '0 5px', display: 'inline-block', width: 'fit-content', color: '#333' }}>
                            {row.itemTag}
                          </span>
                        )}
                        {row.itemName && <span style={{ fontSize: 12, color: '#333' }}>{row.itemName}</span>}
                      </div>
                    </td>

                    <td style={tdStyle}>
                      <input style={cellInputStyle} value={row.description} onChange={e => updateRow(row.id, 'description', e.target.value)} />
                    </td>
                    <td style={tdStyle}>
                      <input style={{ ...cellInputStyle, textAlign: 'right' }} value={row.qty} type="number"
                        onChange={e => updateRow(row.id, 'qty', e.target.value === '' ? '' : Number(e.target.value))} />
                    </td>
                    <td style={tdStyle}>
                      <input style={{ ...cellInputStyle, textAlign: 'right' }} value={row.price} type="number"
                        onChange={e => updateRow(row.id, 'price', e.target.value === '' ? '' : Number(e.target.value))} />
                    </td>
                    <td style={tdStyle}>
                      <input style={cellInputStyle} value={row.account} onChange={e => updateRow(row.id, 'account', e.target.value)} />
                    </td>
                    <td style={tdStyle}>
                      <input style={cellInputStyle} value={row.taxRate} onChange={e => updateRow(row.id, 'taxRate', e.target.value)} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', paddingRight: 8, fontWeight: row.amount !== '' ? 500 : 400, color: row.amount !== '' ? '#333' : '#aaa' }}>
                      {row.amount !== '' ? Number(row.amount).toFixed(2) : ''}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#aaa', cursor: 'pointer' }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="7" cy="3" r="1"/><circle cx="7" cy="7" r="1"/><circle cx="7" cy="11" r="1"/></svg>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 0 20px' }}>
            <div style={{ width: 280 }}>
              <TotalRow label="Subtotal" value={subtotal} />
              <TotalRow label="Total GST" value={totalGST} />
              <div style={{ marginBottom: 8 }}>
                <button style={{ fontSize: 12, background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', color: '#333' }}>
                  Review tax calculation
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '2px solid #1a1a1a' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Total</span>
                <span style={{ fontSize: 22, fontWeight: 700 }}>{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Attach files */}
          <div style={{ paddingBottom: 16 }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#333' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 10h8M6 7V2M4 4l2-2 2 2"/></svg>
              Attach files
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5l3 3 3-3"/></svg>
            </button>
          </div>
        </div>

        {/* History and notes */}
        <div style={{ background: '#fff', borderRadius: 4, border: '1px solid #e3e5e8', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M2 4.5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
              <span style={{ fontWeight: 500, fontSize: 13 }}>History and notes</span>
            </div>
            <button style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontSize: 12, color: '#333' }}>
              Add note
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', marginTop: 4 }}>
          <a href="#" style={{ color: '#0078C8', fontSize: 12, textDecoration: 'none' }}>Switch to classic invoicing</a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#555' }}>
            <div style={{ width: 32, height: 18, background: '#ccc', borderRadius: 9, position: 'relative', cursor: 'pointer' }}>
              <div style={{ width: 14, height: 14, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
            </div>
            Send as an e-invoice
          </div>
        </div>
      </div>

      {/* Portal dropdown */}
      {openDropdownRow !== null && createPortal(
        <div ref={dropdownRef} style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999, background: '#fff', border: '1px solid #ddd', borderRadius: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.14)', minWidth: 300, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#0078C8', fontSize: 13, borderBottom: '1px solid #f0f0f0' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0f7ff')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1v10M1 6h10"/></svg>
            Create new item
          </div>
          <div style={{ padding: '8px 14px', cursor: 'pointer', color: '#555', fontSize: 13, borderBottom: '1px solid #f0f0f0' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            onClick={() => setOpenDropdownRow(null)}>
            No item
          </div>
          {catalog.length === 0 && (
            <div style={{ padding: '12px 14px', fontSize: 12, color: '#888' }}>No inventory items found</div>
          )}
          {catalog.map(item => (
            <div key={item.id} onClick={() => selectCatalogItem(openDropdownRow, item)}
              onMouseEnter={() => setHoveredCatalog(item.id)}
              onMouseLeave={() => setHoveredCatalog(null)}
              style={{ padding: '8px 14px', cursor: 'pointer', background: hoveredCatalog === item.id ? '#f0f7ff' : 'transparent', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                <span style={{ background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 3, fontSize: 10, padding: '0 5px', color: '#333' }}>{item.code}</span>
                <span style={{ fontSize: 11, color: '#888' }}>Qty: {item.quantity}  Cost: {item.costPrice.toFixed(2)}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a1a' }}>{item.name}</div>
              <div style={{ fontSize: 11, color: '#666' }}>{item.description}</div>
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* Approve confirmation modal */}
      {showApproveModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 6, padding: '28px 32px', width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', position: 'relative' }}>
            <button onClick={() => setShowApproveModal(false)} style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 18, lineHeight: 1 }}>×</button>
            <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Approve this bill?</h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#555', lineHeight: 1.5 }}>
              Approving this bill will add the purchased quantities to your inventory.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowApproveModal(false)}
                style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '7px 18px', cursor: 'pointer', fontSize: 13, color: '#333' }}>
                Cancel
              </button>
              <button onClick={() => { setShowApproveModal(false); addToInventory().then(() => setApproved(true)) }}
                style={{ background: '#0078C8', color: '#fff', border: 'none', borderRadius: 4, padding: '7px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                Approve
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  )
}

function DateInput({ value }: { value: string }) {
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 4, height: 32, display: 'flex', alignItems: 'center', paddingLeft: 8, gap: 6, cursor: 'pointer' }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#666" strokeWidth="1.5"><rect x="1" y="2" width="10" height="9" rx="1"/><path d="M1 5h10M4 1v2M8 1v2"/></svg>
      <span style={{ fontSize: 13, color: '#333', flex: 1 }}>{value}</span>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ marginRight: 6, color: '#888' }}><path d="M2 4l4 4 4-4"/></svg>
    </div>
  )
}

function SelectField({ value, small }: { value: string; small?: boolean }) {
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 4, height: small ? 28 : 32, display: 'flex', alignItems: 'center', paddingLeft: 8, gap: 4, cursor: 'pointer', minWidth: small ? 120 : undefined }}>
      {!small && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#666" strokeWidth="1.5"><circle cx="6" cy="6" r="4"/></svg>}
      <span style={{ fontSize: 13, color: '#333', flex: 1 }}>{value}</span>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ marginRight: 4, color: '#888', flexShrink: 0 }}><path d="M2 4l4 4 4-4"/></svg>
    </div>
  )
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: '#555' }}>{label}</span>
      <span style={{ color: '#333' }}>{value.toFixed(2)}</span>
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '8px 6px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: '#555', background: '#fafafa' }
const tdStyle: React.CSSProperties = { padding: '5px 4px', verticalAlign: 'top' }
const cellInputStyle: React.CSSProperties = { width: '100%', border: '1px solid transparent', borderRadius: 3, padding: '4px 6px', fontSize: 12, color: '#333', background: 'transparent', outline: 'none', cursor: 'text' }
