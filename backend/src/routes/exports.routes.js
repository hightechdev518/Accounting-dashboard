import { Router } from 'express'
import { stringify } from 'csv-stringify/sync'
import PDFDocument from 'pdfkit'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { filenameDate, parseExportDateRange } from '../lib/exportDateRange.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const list = await prisma.exportJob.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    res.json(list)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to list exports' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { type, entity } = req.body
    const row = await prisma.exportJob.create({
      data: {
        userId: req.userId,
        type: type || 'csv',
        entity: entity || 'invoices',
        status: 'completed',
        fileUrl: `/exports/${Date.now()}.csv`,
      },
    })
    res.status(201).json(row)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to create export job' })
  }
})

/** GET /api/exports/invoices?from=&to=&format=csv|pdf */
router.get('/invoices', async (req, res) => {
  const range = parseExportDateRange(req)
  if ('error' in range) return res.status(400).json({ error: range.error })

  const format = String(req.query.format || 'csv').toLowerCase()
  if (format !== 'csv' && format !== 'pdf') {
    return res.status(400).json({ error: 'format must be csv or pdf' })
  }

  const { fromDate, toDate } = range
  const userId = req.userId

  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        issuedAt: { gte: fromDate, lte: toDate },
      },
      include: { client: true },
      orderBy: { issuedAt: 'asc' },
    })

    const fn = `invoices-${filenameDate(fromDate)}_${filenameDate(toDate)}`

    if (format === 'csv') {
      const rows = invoices.map((inv) => ({
        number: inv.number,
        client: inv.client?.name ?? '',
        status: inv.status,
        amount: Number(inv.amount).toFixed(2),
        issuedAt: inv.issuedAt.toISOString().slice(0, 10),
        dueDate: inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : '',
      }))
      const csv =
        '\uFEFF' +
        stringify(rows, {
          header: true,
          columns: [
            { key: 'number', header: 'Number' },
            { key: 'client', header: 'Client' },
            { key: 'status', header: 'Status' },
            { key: 'amount', header: 'Amount' },
            { key: 'issuedAt', header: 'Issued' },
            { key: 'dueDate', header: 'Due' },
          ],
        })
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${fn}.csv"`)
      return res.send(csv)
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${fn}.pdf"`)

    const doc = new PDFDocument({ margin: 48, size: 'LETTER' })
    doc.pipe(res)

    doc.fontSize(18).text('Invoices', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(10).fillColor('#666').text(`Period: ${filenameDate(fromDate)} to ${filenameDate(toDate)} (UTC)`)
    doc.moveDown(1)
    doc.fillColor('#000')

    if (invoices.length === 0) {
      doc.fontSize(11).text('No invoices in this date range.')
    } else {
      doc.fontSize(9)
      let y = doc.y
      const lineH = 14
      const cols = [70, 120, 60, 70, 70, 70]
      const headers = ['Number', 'Client', 'Status', 'Amount', 'Issued', 'Due']
      doc.font('Helvetica-Bold')
      let x = 48
      headers.forEach((h, i) => {
        doc.text(h, x, y, { width: cols[i] })
        x += cols[i]
      })
      y += lineH
      doc.font('Helvetica')
      for (const inv of invoices) {
        if (y > 720) {
          doc.addPage()
          y = 48
        }
        x = 48
        const row = [
          inv.number,
          (inv.client?.name ?? '').slice(0, 22),
          inv.status,
          Number(inv.amount).toFixed(2),
          inv.issuedAt.toISOString().slice(0, 10),
          inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : '—',
        ]
        row.forEach((cell, i) => {
          doc.text(String(cell), x, y, { width: cols[i] })
          x += cols[i]
        })
        y += lineH
      }
    }

    doc.end()
  } catch (e) {
    console.error(e)
    if (!res.headersSent) res.status(500).json({ error: 'Failed to export invoices' })
  }
})

/** GET /api/exports/payments?from=&to= — CSV only */
router.get('/payments', async (req, res) => {
  const range = parseExportDateRange(req)
  if ('error' in range) return res.status(400).json({ error: range.error })

  const { fromDate, toDate } = range
  const userId = req.userId

  try {
    const payments = await prisma.payment.findMany({
      where: {
        paidAt: { gte: fromDate, lte: toDate },
        invoice: { userId },
      },
      include: {
        invoice: { include: { client: true } },
      },
      orderBy: { paidAt: 'asc' },
    })

    const rows = payments.map((p) => ({
      paidAt: p.paidAt.toISOString(),
      amount: Number(p.amount).toFixed(2),
      method: p.method,
      invoiceNumber: p.invoice?.number ?? '',
      client: p.invoice?.client?.name ?? '',
      note: p.note ?? '',
    }))

    const csv =
      '\uFEFF' +
      stringify(rows, {
        header: true,
        columns: [
          { key: 'paidAt', header: 'Paid At' },
          { key: 'amount', header: 'Amount' },
          { key: 'method', header: 'Method' },
          { key: 'invoiceNumber', header: 'Invoice' },
          { key: 'client', header: 'Client' },
          { key: 'note', header: 'Note' },
        ],
      })

    const fn = `payments-${filenameDate(fromDate)}_${filenameDate(toDate)}`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${fn}.csv"`)
    res.send(csv)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to export payments' })
  }
})

/** GET /api/exports/profit-loss?from=&to= — PDF P&L (cash revenue from payments, expenses by category) */
router.get('/profit-loss', async (req, res) => {
  const range = parseExportDateRange(req)
  if ('error' in range) return res.status(400).json({ error: range.error })

  const { fromDate, toDate } = range
  const userId = req.userId

  try {
    const [paymentSum, expenses, expenseByCategory] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          paidAt: { gte: fromDate, lte: toDate },
          invoice: { userId },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          userId,
          date: { gte: fromDate, lte: toDate },
        },
        _sum: { amount: true },
      }),
      prisma.expense.groupBy({
        by: ['category'],
        where: {
          userId,
          date: { gte: fromDate, lte: toDate },
        },
        _sum: { amount: true },
      }),
    ])

    const revenue = Number(paymentSum._sum.amount || 0)
    const totalExpenses = Number(expenses._sum.amount || 0)
    const net = revenue - totalExpenses

    const fn = `profit-loss-${filenameDate(fromDate)}_${filenameDate(toDate)}`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${fn}.pdf"`)

    const doc = new PDFDocument({ margin: 48, size: 'LETTER' })
    doc.pipe(res)

    doc.fontSize(20).text('Profit & Loss', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(10).fillColor('#666').text(`Period: ${filenameDate(fromDate)} to ${filenameDate(toDate)} (UTC)`)
    doc.moveDown(1.2)
    doc.fillColor('#000')

    doc.fontSize(12).font('Helvetica-Bold').text('Summary')
    doc.moveDown(0.4)
    doc.font('Helvetica').fontSize(11)
    doc.text(`Revenue (cash — payments received): $${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    doc.moveDown(0.3)
    doc.text(`Total expenses: $${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    doc.moveDown(0.5)
    doc.font('Helvetica-Bold').text(`Net income: $${net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)

    doc.moveDown(1)
    doc.fontSize(12).font('Helvetica-Bold').text('Expenses by category')
    doc.moveDown(0.4)
    doc.font('Helvetica').fontSize(10)

    if (expenseByCategory.length === 0) {
      doc.text('No expenses in this period.')
    } else {
      for (const row of expenseByCategory.sort((a, b) => a.category.localeCompare(b.category))) {
        const amt = Number(row._sum.amount || 0)
        doc.text(`${row.category}: $${amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        doc.moveDown(0.25)
      }
    }

    doc.moveDown(1)
    doc.fontSize(8).fillColor('#888')
    doc.text(
      'Revenue reflects sum of payments in the period. For accrual reporting, filter invoices separately.',
      { width: 500 },
    )

    doc.end()
  } catch (e) {
    console.error(e)
    if (!res.headersSent) res.status(500).json({ error: 'Failed to generate P&L report' })
  }
})

export default router
