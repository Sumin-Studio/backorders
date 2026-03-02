import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const fromDb = (r: any) => ({
  id: r.id, code: r.code, name: r.name, description: r.description,
  costPrice: r.cost_price, salePrice: r.sale_price,
  quantity: r.quantity, qtyOnOrder: r.qty_on_order,
  account: r.account, taxRate: r.tax_rate,
})

const toDb = (b: any) => ({
  code: b.code, name: b.name, description: b.description,
  cost_price: Number(b.costPrice), sale_price: Number(b.salePrice),
  quantity: Number(b.quantity), qty_on_order: Number(b.qtyOnOrder),
  account: b.account, tax_rate: b.taxRate,
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = Number(req.query.id)

  if (req.method === 'PUT') {
    const { data, error } = await supabase
      .from('inventory').update(toDb(req.body)).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json(fromDb(data))
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('inventory').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }

  res.status(405).end()
}
