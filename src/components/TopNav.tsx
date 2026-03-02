import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'

const SALES_MENU = [
  { label: 'Sales overview', path: '/invoices' },
  { label: 'Invoices', path: '/invoices' },
  { label: 'Payment links', path: '#' },
  { label: 'Online payments', path: '#' },
  { label: 'Quotes', path: '#' },
  { label: 'Product and services', path: '/inventory' },
  { label: 'Customers', path: '#' },
  { label: 'Sales settings', path: '#' },
]

const CREATE_MENU = [
  { label: 'Invoice', path: '/invoice' },
  { label: 'Payment link', path: '#' },
  { label: 'Bill', path: '/bill' },
  { label: 'Contact', path: '#' },
  { label: 'Quotes', path: '#' },
  { label: 'Purchase order', path: '#' },
  { label: 'Manual journal', path: '#' },
  { label: 'Spend money', path: '#' },
  { label: 'Receive money', path: '#' },
  { label: 'Transfer money', path: '#' },
]

export default function TopNav({ activePage }: { activePage?: string }) {
  const navigate = useNavigate()

  const [salesOpen, setSalesOpen] = useState(false)
  const [salesPos, setSalesPos] = useState({ top: 0, left: 0 })
  const salesRef = useRef<HTMLDivElement>(null)
  const salesDropRef = useRef<HTMLDivElement>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createPos, setCreatePos] = useState({ top: 0, left: 0 })
  const createRef = useRef<HTMLButtonElement>(null)
  const createDropRef = useRef<HTMLDivElement>(null)

  const [hoveredSales, setHoveredSales] = useState<string | null>(null)
  const [hoveredCreate, setHoveredCreate] = useState<string | null>(null)

  // Close both dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as Node
      if (salesRef.current?.contains(t) || salesDropRef.current?.contains(t)) return
      setSalesOpen(false)
      if (createRef.current?.contains(t) || createDropRef.current?.contains(t)) return
      setCreateOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function openSales() {
    if (salesRef.current) {
      const r = salesRef.current.getBoundingClientRect()
      setSalesPos({ top: r.bottom, left: r.left })
    }
    setCreateOpen(false)
    setSalesOpen(v => !v)
  }

  function openCreate() {
    if (createRef.current) {
      const r = createRef.current.getBoundingClientRect()
      // align right edge of dropdown with right edge of button
      setCreatePos({ top: r.bottom + 4, left: r.right - 200 })
    }
    setSalesOpen(false)
    setCreateOpen(v => !v)
  }

  const isSalesActive = activePage === 'invoice' || activePage === 'invoices' || activePage === 'inventory'

  return (
    <>
      <nav style={{ background: '#0078C8', color: '#fff', height: 40, display: 'flex', alignItems: 'center', paddingLeft: 12, paddingRight: 12, gap: 0, fontSize: 13, flexShrink: 0, position: 'relative', zIndex: 200 }}>

        {/* Xero logo */}
        <div style={{ marginRight: 12, display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="white"/>
            <text x="14" y="19" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#0078C8">x</text>
          </svg>
        </div>

        {/* Company */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 16, fontWeight: 500, cursor: 'pointer', color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
          Hornblower Enterprises
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M2 4l4 4 4-4"/></svg>
        </div>

        {/* Nav items */}
        {['Home', 'Sales', 'Purchases', 'Reporting', 'Payroll', 'Accounting', 'Tax', 'Contacts', 'Projects'].map(label => {
          const isSales = label === 'Sales'
          const isActive = isSales ? isSalesActive : false
          return (
            <div
              key={label}
              ref={isSales ? salesRef : undefined}
              onClick={isSales ? openSales : undefined}
              style={{
                padding: '0 10px', height: 40, display: 'flex', alignItems: 'center', gap: 4,
                cursor: 'pointer',
                color: isActive || (isSales && salesOpen) ? '#fff' : 'rgba(255,255,255,0.85)',
                borderBottom: isActive ? '2px solid #fff' : 'none',
                fontWeight: isActive ? 600 : 400,
                userSelect: 'none',
              }}
            >
              {label}
              {isSales && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ opacity: 0.8, marginTop: 1 }}>
                  <path d={salesOpen ? 'M2 6.5l3-3 3 3' : 'M2 3.5l3 3 3-3'} />
                </svg>
              )}
            </div>
          )
        })}

        {/* Right icons */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* + Create button */}
          <button
            ref={createRef}
            onClick={openCreate}
            title="Create new"
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: createOpen ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
              border: 'none', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M7 2v10M2 7h10"/>
            </svg>
          </button>

          {/* Search */}
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
            </svg>
          </button>

          {/* Bell */}
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 2a4 4 0 0 1 4 4v2l1 2H3l1-2V6a4 4 0 0 1 4-4z"/><path d="M6.5 13a1.5 1.5 0 0 0 3 0"/>
            </svg>
          </button>

          {/* Avatar */}
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#004B87', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
            NH
          </div>
        </div>
      </nav>

      {/* Sales dropdown */}
      {salesOpen && createPortal(
        <div
          ref={salesDropRef}
          style={{ position: 'fixed', top: salesPos.top, left: salesPos.left, zIndex: 9999, background: '#fcfcfc', border: '1px solid #CCCED2', borderRadius: 8, boxShadow: '0 3px 6px rgba(0,10,30,0.2)', width: 220, paddingTop: 8, paddingBottom: 8 }}
        >
          {SALES_MENU.map((item, i) => (
            <div
              key={i}
              onClick={() => { setSalesOpen(false); if (item.path !== '#') navigate(item.path) }}
              onMouseEnter={() => setHoveredSales(item.label)}
              onMouseLeave={() => setHoveredSales(null)}
              style={{ padding: '8px 20px', fontSize: 13, cursor: item.path !== '#' ? 'pointer' : 'default', background: hoveredSales === item.label ? '#E6E7E9' : 'transparent', color: '#1a1a1a' }}
            >
              {item.label}
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* Create new dropdown */}
      {createOpen && createPortal(
        <div
          ref={createDropRef}
          style={{ position: 'fixed', top: createPos.top, left: createPos.left, zIndex: 9999, background: '#fff', border: '1px solid #CCCED2', borderRadius: 6, boxShadow: '0 3px 12px rgba(0,10,30,0.18)', width: 200, paddingTop: 4, paddingBottom: 4 }}
        >
          {/* Header */}
          <div style={{ padding: '8px 16px 6px', fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f0f0f0', marginBottom: 4 }}>
            Create new
          </div>
          {CREATE_MENU.map((item, i) => (
            <div
              key={i}
              onClick={() => { setCreateOpen(false); if (item.path !== '#') navigate(item.path) }}
              onMouseEnter={() => setHoveredCreate(item.label)}
              onMouseLeave={() => setHoveredCreate(null)}
              style={{
                padding: '7px 16px', fontSize: 13, cursor: item.path !== '#' ? 'pointer' : 'default',
                background: hoveredCreate === item.label ? '#f0f7ff' : 'transparent',
                color: hoveredCreate === item.label ? '#0078C8' : '#1a1a1a',
                fontWeight: item.label === 'Invoice' ? 500 : 400,
              }}
            >
              {item.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
