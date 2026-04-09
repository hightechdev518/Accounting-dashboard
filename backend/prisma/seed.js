import {
  PrismaClient,
  Prisma,
  InvoiceStatus,
  BillStatus,
  ProjectStatus,
  TaxDeadlineStatus,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('numeris123', 10)

  const user = await prisma.user.upsert({
    where: { email: 'thomas@numeris.app' },
    update: { name: 'Thomas', passwordHash },
    create: {
      email: 'thomas@numeris.app',
      name: 'Thomas',
      passwordHash,
    },
  })

  await prisma.refreshToken.deleteMany({ where: { userId: user.id } })
  await prisma.timeEntry.deleteMany({ where: { userId: user.id } })
  await prisma.project.deleteMany({ where: { userId: user.id } })
  await prisma.invoiceItem.deleteMany({ where: { invoice: { userId: user.id } } })
  await prisma.payment.deleteMany({ where: { invoice: { userId: user.id } } })
  await prisma.invoice.deleteMany({ where: { userId: user.id } })
  await prisma.bill.deleteMany({ where: { userId: user.id } })
  await prisma.expense.deleteMany({ where: { userId: user.id } })
  await prisma.taxDeadline.deleteMany({ where: { userId: user.id } })
  await prisma.exportJob.deleteMany({ where: { userId: user.id } })
  await prisma.client.deleteMany({ where: { userId: user.id } })

  const clientsData = [
    { name: 'Acme Corp', email: 'billing@acme.example.com', phone: '+1 555 0101' },
    { name: 'Blue Sky Media', email: 'ap@bluesky.example.com', phone: '+1 555 0102' },
    { name: 'Horizon Group', email: 'finance@horizon.example.com' },
    { name: 'Office Supplies Co', email: 'orders@officesupplies.example.com' },
    { name: 'Cloud Hosting', email: 'noc@cloudhost.example.com' },
  ]

  const clients = []
  for (const c of clientsData) {
    clients.push(
      await prisma.client.create({
        data: {
          userId: user.id,
          name: c.name,
          email: c.email ?? null,
          phone: c.phone ?? null,
        },
      }),
    )
  }
  const findClient = (name) => clients.find((c) => c.name === name)

  function lineAmount(qty, rate) {
    return new Prisma.Decimal(String(qty)).mul(new Prisma.Decimal(String(rate))).toDecimalPlaces(2)
  }

  await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: findClient('Acme Corp').id,
      number: 'INV-2026-0001',
      status: InvoiceStatus.PAID,
      amount: new Prisma.Decimal('6000.00'),
      issuedAt: new Date(Date.UTC(2026, 3, 10, 12, 0, 0)),
      dueDate: new Date(Date.UTC(2026, 4, 10, 12, 0, 0)),
      items: {
        create: [
          {
            description: 'Consulting services',
            quantity: new Prisma.Decimal('1'),
            rate: new Prisma.Decimal('6000'),
            amount: lineAmount(1, 6000),
          },
        ],
      },
    },
  })
  await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: findClient('Blue Sky Media').id,
      number: 'INV-2026-0002',
      status: InvoiceStatus.PAID,
      amount: new Prisma.Decimal('4000.00'),
      issuedAt: new Date(Date.UTC(2026, 3, 2, 12, 0, 0)),
      dueDate: new Date(Date.UTC(2026, 4, 2, 12, 0, 0)),
      items: {
        create: [
          {
            description: 'Media retainer',
            quantity: new Prisma.Decimal('1'),
            rate: new Prisma.Decimal('4000'),
            amount: lineAmount(1, 4000),
          },
        ],
      },
    },
  })
  await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: findClient('Horizon Group').id,
      number: 'INV-2026-0003',
      status: InvoiceStatus.PAID,
      amount: new Prisma.Decimal('8000.00'),
      issuedAt: new Date(Date.UTC(2026, 2, 20, 12, 0, 0)),
      dueDate: new Date(Date.UTC(2026, 3, 20, 12, 0, 0)),
      items: {
        create: [
          {
            description: 'Project milestone',
            quantity: new Prisma.Decimal('1'),
            rate: new Prisma.Decimal('8000'),
            amount: lineAmount(1, 8000),
          },
        ],
      },
    },
  })

  const paidInvoices = await prisma.invoice.findMany({
    where: { userId: user.id, status: InvoiceStatus.PAID },
  })
  for (const inv of paidInvoices) {
    await prisma.payment.create({
      data: {
        invoiceId: inv.id,
        amount: inv.amount,
        method: 'bank_transfer',
        note: `Payment for ${inv.number}`,
        paidAt: inv.issuedAt,
      },
    })
  }

  await prisma.expense.createMany({
    data: [
      {
        userId: user.id,
        category: 'Software',
        amount: 3000,
        description: 'Subscriptions',
        date: new Date(Date.UTC(2026, 3, 5, 12, 0, 0)),
      },
      {
        userId: user.id,
        category: 'Travel',
        amount: 2000,
        description: 'Client visit',
        date: new Date(Date.UTC(2026, 3, 12, 12, 0, 0)),
      },
      {
        userId: user.id,
        category: 'Office',
        amount: 4000,
        description: 'March ops',
        date: new Date(Date.UTC(2026, 2, 15, 12, 0, 0)),
      },
    ],
  })

  await prisma.bill.createMany({
    data: [
      {
        userId: user.id,
        clientId: findClient('Office Supplies Co').id,
        title: 'Stationery',
        amount: 120.5,
        status: BillStatus.AWAITING,
        dueDate: new Date(Date.UTC(2026, 2, 1, 12, 0, 0)),
      },
      {
        userId: user.id,
        clientId: findClient('Cloud Hosting').id,
        title: 'Server hosting',
        amount: 89.99,
        status: BillStatus.OVERDUE,
        dueDate: new Date(Date.UTC(2026, 3, 7, 12, 0, 0)),
      },
      {
        userId: user.id,
        clientId: findClient('Acme Corp').id,
        title: 'Consulting retainer',
        amount: 1500,
        status: BillStatus.AWAITING,
        dueDate: new Date(Date.UTC(2026, 3, 16, 12, 0, 0)),
      },
      {
        userId: user.id,
        clientId: findClient('Blue Sky Media').id,
        title: 'Campaign tools',
        amount: 450,
        status: BillStatus.AWAITING,
        dueDate: new Date(Date.UTC(2026, 3, 22, 12, 0, 0)),
      },
    ],
  })

  const deadlineRows = [
    { title: 'GST Return', period: 'Q3 2025–26 filing', dueDate: new Date(Date.UTC(2026, 3, 15, 12, 0, 0)) },
    { title: 'Provisional tax', period: 'Second instalment', dueDate: new Date(Date.UTC(2026, 4, 28, 12, 0, 0)) },
    { title: 'PAYE', period: 'Monthly employer filing', dueDate: new Date(Date.UTC(2026, 5, 5, 12, 0, 0)) },
    { title: 'GST Return', period: 'Q4 2025–26 filing', dueDate: new Date(Date.UTC(2026, 6, 15, 12, 0, 0)) },
    { title: 'Income tax', period: 'Terminal tax year-end', dueDate: new Date(Date.UTC(2026, 7, 7, 12, 0, 0)) },
  ]
  for (const d of deadlineRows) {
    await prisma.taxDeadline.create({
      data: {
        userId: user.id,
        title: d.title,
        period: d.period,
        dueDate: d.dueDate,
        status: TaxDeadlineStatus.PENDING,
      },
    })
  }

  await prisma.exportJob.create({
    data: {
      userId: user.id,
      type: 'csv',
      entity: 'invoices',
      status: 'completed',
      fileUrl: '/exports/invoices-sample.csv',
    },
  })

  const p1 = await prisma.project.create({
    data: {
      userId: user.id,
      clientId: findClient('Acme Corp').id,
      name: 'Website redesign',
      status: ProjectStatus.ACTIVE,
    },
  })
  await prisma.timeEntry.create({
    data: {
      userId: user.id,
      projectId: p1.id,
      hours: 2,
      description: 'Design review',
      date: new Date(Date.UTC(2026, 3, 1, 12, 0, 0)),
    },
  })

  console.log('Seed OK — login: thomas@numeris.app / numeris123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
