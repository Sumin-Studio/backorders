import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const fromDb = (r: any) => ({
  id: r.id, number: r.number, ref: r.ref, to: r.contact,
  date: r.date, dueDate: r.due_date,
  paid: r.paid, due: r.due, status: r.status, sent: r.sent,
  items: r.items || [], history: r.history || [],
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('invoices').select('*').order('id', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data.map(fromDb))
  }

  if (req.method === 'POST') {
    const { data: existing } = await supabase.from('invoices').select('number')
    const maxNum = (existing || []).reduce((max: number, inv: any) => {
      const n = parseInt((inv.number || '').replace('INV-', ''))
      return isNaN(n) ? max : Math.max(max, n)
    }, 0)

    const row = {
      id: Date.now(),
      number: `INV-${String(maxNum + 1).padStart(4, '0')}`,
      ref: req.body.ref || '',
      contact: req.body.to || 'Customer',
      date: req.body.date || '',
      due_date: req.body.dueDate || '',
      paid: 0,
      due: Number(req.body.due) || 0,
      status: 'Awaiting Payment',
      sent: false,
      items: req.body.items || [],
      history: [],
    }

    const { data, error } = await supabase.from('invoices').insert(row).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(fromDb(data))
  }

  res.status(405).end()
}
