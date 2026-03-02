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
  const id = Number(req.query.id)

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('invoices').select('*').eq('id', id).single()
    if (error) return res.status(404).json({ error: 'Not found' })
    return res.json(fromDb(data))
  }

  if (req.method === 'PUT') {
    const updates: any = {}
    if (req.body.history !== undefined) updates.history = req.body.history
    if (req.body.status !== undefined) updates.status = req.body.status
    if (req.body.sent !== undefined) updates.sent = req.body.sent
    if (req.body.to !== undefined) updates.contact = req.body.to
    if (req.body.dueDate !== undefined) updates.due_date = req.body.dueDate
    if (req.body.paid !== undefined) updates.paid = req.body.paid

    const { data, error } = await supabase
      .from('invoices').update(updates).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json(fromDb(data))
  }

  res.status(405).end()
}
