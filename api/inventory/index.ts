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
  code: b.code ?? '', name: b.name ?? '', description: b.description ?? '',
  cost_price: Number(b.costPrice) || 0, sale_price: Number(b.salePrice) || 0,
  quantity: Number(b.quantity) || 0, qty_on_order: Number(b.qtyOnOrder) || 0,
  account: b.account ?? '200 - Sales', tax_rate: b.taxRate ?? '15% GST on Income',
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('inventory').select('*').order('id')
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data.map(fromDb))
  }

  if (req.method === 'POST') {
    const { data, error } = await supabase
      .from('inventory').insert({ id: Date.now(), ...toDb(req.body) }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(fromDb(data))
  }

  res.status(405).end()
}
