import { useState, useEffect } from 'react'
import TopNav from './TopNav'

export interface InventoryItem {
  id: number
  code: string
  name: string
  description: string
  costPrice: number
  salePrice: number
  quantity: number
  qtyOnOrder: number
  account: string
  taxRate: string
}

interface EditingItem extends Omit<InventoryItem, 'id'> { id?: number }

const EMPTY_ITEM: EditingItem = {
  code: '', name: '', description: '', costPrice: 0, salePrice: 0,
  quantity: 0, qtyOnOrder: 0, account: '200 - Sales', taxRate: '15% GST on Income',
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<EditingItem>(EMPTY_ITEM)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    const res = await fetch('/api/inventory')
    setItems(await res.json())
  }

  async function saveItem() {
    setSaving(true)
    if (editing.id) {
      await fetch(`/api/inventory/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
    } else {
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
    }
    await fetchItems()
    setSaving(false)
    setShowModal(false)
    setEditing(EMPTY_ITEM)
  }

  async function deleteSelected() {
    await Promise.all([...selected].map(id =>
      fetch(`/api/inventory/${id}`, { method: 'DELETE' })
    ))
    setSelected(new Set())
    await fetchItems()
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.code.toLowerCase().includes(search.toLowerCase())
  )

  const allSelected = filtered.length > 0 && filtered.every(i => selected.has(i.id))

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(filtered.map(i => i.id)))
  }

  function toggleOne(id: number) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f4f5f6' }}>
      <TopNav activePage="inventory" />

      {/* Page header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e3e5e8', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Products and services</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={outlineBtn}>Import <Chevron /></button>
          <button style={outlineBtn}>Export <Chevron /></button>
          <div style={{ display: 'flex' }}>
            <button
              onClick={() => { setEditing(EMPTY_ITEM); setShowModal(true) }}
              style={{ background: '#0078C8', color: '#fff', border: 'none', borderRadius: '4px 0 0 4px', padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
            >
              Create item
            </button>
            <button style={{ background: '#006aaf', color: '#fff', border: 'none', borderRadius: '0 4px 4px 0', padding: '6px 8px', cursor: 'pointer' }}>
              <Chevron />
            </button>
          </div>
          <button style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '6px 8px', cursor: 'pointer', color: '#333' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="7" cy="3" r="1"/><circle cx="7" cy="7" r="1"/><circle cx="7" cy="11" r="1"/></svg>
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ padding: '24px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 4, border: '1px solid #e3e5e8' }}>

          {/* Search + filter bar */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e3e5e8', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#888' }} width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="4"/><path d="M10 10l3 3"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search"
                style={{ width: '100%', border: '1px solid #ccc', borderRadius: 4, padding: '6px 10px 6px 30px', fontSize: 13, outline: 'none' }}
              />
            </div>
            <button style={{ ...outlineBtn, color: '#0078C8' }}>Filter ▾</button>
            <button style={{ ...outlineBtn, color: '#0078C8' }}>Columns <span style={{ background: '#0078C8', color: '#fff', borderRadius: 3, padding: '0 5px', fontSize: 11, marginLeft: 4 }}>■</span></button>
          </div>

          {/* Bulk actions */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #e3e5e8', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={{ ...outlineBtn, fontWeight: 500 }} onClick={toggleAll}>
              Select all items
            </button>
            <button style={{ background: 'none', border: 'none', cursor: selected.size > 0 ? 'pointer' : 'default', fontSize: 13, color: selected.size > 0 ? '#333' : '#aaa', padding: 0 }}>
              Archive
            </button>
            <button style={{ background: 'none', border: 'none', cursor: selected.size > 0 ? 'pointer' : 'default', fontSize: 13, color: selected.size > 0 ? '#333' : '#aaa', padding: 0 }}>
              Adjustment
            </button>
            <button
              onClick={deleteSelected}
              style={{ background: 'none', border: 'none', cursor: selected.size > 0 ? 'pointer' : 'default', fontSize: 13, color: selected.size > 0 ? '#e53e3e' : '#aaa', padding: 0 }}
            >
              Delete
            </button>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#555' }}>{selected.size} items selected</span>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e3e5e8', background: '#fafafa' }}>
                <th style={{ ...th, width: 36 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                </th>
                <th style={th}>
                  Code <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ marginLeft: 3 }}><path d="M5 2l3 4H2l3-4z"/></svg>
                </th>
                <th style={th}>Name</th>
                <th style={{ ...th, textAlign: 'right' }}>Cost price</th>
                <th style={{ ...th, textAlign: 'right' }}>Sale price</th>
                <th style={{ ...th, textAlign: 'right' }}>Quantity</th>
                <th style={{ ...th, width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#888', fontSize: 13 }}>No items found</td></tr>
              )}
              {filtered.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }} onMouseEnter={e => (e.currentTarget.style.background = '#fafeff')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={td}>
                    <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleOne(item.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={td}>
                    <span style={{ border: '1px solid #ccc', borderRadius: 3, fontSize: 11, padding: '1px 6px', color: '#444' }}>{item.code}</span>
                  </td>
                  <td style={{ ...td, fontWeight: 600 }}>{item.name}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{item.costPrice.toFixed(2)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{item.salePrice.toFixed(2)}</td>
                  <td style={{ ...td, textAlign: 'right', color: item.quantity < 0 ? '#e53e3e' : undefined, fontWeight: item.quantity < 0 ? 600 : undefined }}>
                    {item.quantity}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="#aaa" style={{ cursor: 'pointer' }}><circle cx="7" cy="3" r="1"/><circle cx="7" cy="7" r="1"/><circle cx="7" cy="11" r="1"/></svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid #e3e5e8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#555' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Items per page
              <select style={{ border: '1px solid #ccc', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>
                <option>25</option>
                <option>50</option>
              </select>
            </div>
            <span>Showing items 1–{filtered.length} of {filtered.length}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0078C8' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#aaa" strokeWidth="1.5"><path d="M9 2L5 7l4 5"/></svg>
              Page 1 of 1 ▾
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#0078C8" strokeWidth="1.5"><path d="M5 2l4 5-4 5"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 6, padding: 28, width: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600 }}>{editing.id ? 'Edit item' : 'Create item'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <ModalField label="Code">
                <input style={modalInput} value={editing.code} onChange={e => setEditing({ ...editing, code: e.target.value })} />
              </ModalField>
              <ModalField label="Name">
                <input style={modalInput} value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </ModalField>
              <ModalField label="Description" style={{ gridColumn: '1 / -1' }}>
                <input style={modalInput} value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              </ModalField>
              <ModalField label="Cost price">
                <input style={modalInput} type="number" value={editing.costPrice} onChange={e => setEditing({ ...editing, costPrice: Number(e.target.value) })} />
              </ModalField>
              <ModalField label="Sale price">
                <input style={modalInput} type="number" value={editing.salePrice} onChange={e => setEditing({ ...editing, salePrice: Number(e.target.value) })} />
              </ModalField>
              <ModalField label="Quantity">
                <input style={modalInput} type="number" value={editing.quantity} onChange={e => setEditing({ ...editing, quantity: Number(e.target.value) })} />
              </ModalField>
              <ModalField label="Qty on order">
                <input style={modalInput} type="number" value={editing.qtyOnOrder} onChange={e => setEditing({ ...editing, qtyOnOrder: Number(e.target.value) })} />
              </ModalField>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
              <button onClick={() => { setShowModal(false); setEditing(EMPTY_ITEM) }} style={outlineBtn}>Cancel</button>
              <button onClick={saveItem} disabled={saving} style={{ background: '#0078C8', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 500, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ModalField({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  )
}

function Chevron() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ marginLeft: 2 }}><path d="M2 3.5l3 3 3-3"/></svg>
}

const outlineBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #ccc', borderRadius: 4,
  padding: '5px 10px', cursor: 'pointer', fontSize: 13, color: '#333',
  display: 'flex', alignItems: 'center',
}

const th: React.CSSProperties = {
  padding: '9px 12px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: '#555',
}

const td: React.CSSProperties = {
  padding: '10px 12px', fontSize: 13, verticalAlign: 'middle',
}

const modalInput: React.CSSProperties = {
  width: '100%', border: '1px solid #ccc', borderRadius: 4,
  padding: '6px 8px', fontSize: 13, outline: 'none',
}
