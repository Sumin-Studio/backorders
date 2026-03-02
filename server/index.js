import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001
const DATA_FILE = path.join(__dirname, 'data', 'inventory.json')
const INVOICES_FILE = path.join(__dirname, 'data', 'invoices.json')

app.use(cors())
app.use(express.json())

function readInventory() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
}

function writeInventory(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

function readInvoices() {
  return JSON.parse(fs.readFileSync(INVOICES_FILE, 'utf-8'))
}

function writeInvoices(data) {
  fs.writeFileSync(INVOICES_FILE, JSON.stringify(data, null, 2))
}

// GET all inventory items
app.get('/api/inventory', (req, res) => {
  res.json(readInventory())
})

// POST create new item
app.post('/api/inventory', (req, res) => {
  const items = readInventory()
  const newItem = {
    id: Date.now(),
    code: req.body.code || '',
    name: req.body.name || '',
    description: req.body.description || '',
    costPrice: Number(req.body.costPrice) || 0,
    salePrice: Number(req.body.salePrice) || 0,
    quantity: Number(req.body.quantity) || 0,
    qtyOnOrder: Number(req.body.qtyOnOrder) || 0,
    account: req.body.account || '200 - Sales',
    taxRate: req.body.taxRate || '15% GST on Income',
  }
  items.push(newItem)
  writeInventory(items)
  res.status(201).json(newItem)
})

// PUT update item
app.put('/api/inventory/:id', (req, res) => {
  const items = readInventory()
  const idx = items.findIndex(i => i.id === Number(req.params.id))
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  items[idx] = { ...items[idx], ...req.body, id: items[idx].id }
  writeInventory(items)
  res.json(items[idx])
})

// DELETE item
app.delete('/api/inventory/:id', (req, res) => {
  let items = readInventory()
  items = items.filter(i => i.id !== Number(req.params.id))
  writeInventory(items)
  res.json({ ok: true })
})

// GET all invoices
app.get('/api/invoices', (req, res) => {
  res.json(readInvoices())
})

// GET single invoice
app.get('/api/invoices/:id', (req, res) => {
  const invoices = readInvoices()
  const invoice = invoices.find(i => i.id === Number(req.params.id))
  if (!invoice) return res.status(404).json({ error: 'Not found' })
  res.json(invoice)
})

// PUT update invoice (history, status, etc.)
app.put('/api/invoices/:id', (req, res) => {
  const invoices = readInvoices()
  const idx = invoices.findIndex(i => i.id === Number(req.params.id))
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  invoices[idx] = { ...invoices[idx], ...req.body, id: invoices[idx].id }
  writeInvoices(invoices)
  res.json(invoices[idx])
})

// POST create invoice
app.post('/api/invoices', (req, res) => {
  const invoices = readInvoices()
  const maxNum = invoices.reduce((max, inv) => {
    const num = parseInt(inv.number.replace('INV-', ''))
    return isNaN(num) ? max : Math.max(max, num)
  }, 0)
  const newInvoice = {
    id: Date.now(),
    number: `INV-${String(maxNum + 1).padStart(4, '0')}`,
    ref: req.body.ref || '',
    to: req.body.to || 'Customer',
    date: req.body.date || '',
    dueDate: req.body.dueDate || '',
    paid: 0,
    due: Number(req.body.due) || 0,
    status: 'Awaiting Payment',
    sent: false,
    items: req.body.items || [],
  }
  invoices.unshift(newInvoice)
  writeInvoices(invoices)
  res.status(201).json(newInvoice)
})

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`))
