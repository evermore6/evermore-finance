import { formatCurrency, formatDate } from './index'

// ── CSV Export ────────────────────────────────────────────
export const exportToCSV = (transactions, filename = 'evermore-transactions') => {
  const headers = ['Date', 'Type', 'Category', 'Amount', 'Payment Method', 'Description', 'Recurring']
  const rows = transactions.map(t => [
    formatDate(t.date),
    t.type,
    t.category,
    t.amount,
    t.payment_method || '',
    t.description || '',
    t.is_recurring ? 'Yes' : 'No',
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  downloadBlob(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`)
}

// ── Excel Export ──────────────────────────────────────────
export const exportToExcel = async (transactions, filename = 'evermore-transactions') => {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Evermore Finance'
  wb.created = new Date()

  const ws = wb.addWorksheet('Transactions')

  // Header styling
  ws.columns = [
    { header: 'Date',           key: 'date',           width: 16 },
    { header: 'Type',           key: 'type',           width: 12 },
    { header: 'Category',       key: 'category',       width: 20 },
    { header: 'Amount (IDR)',   key: 'amount',         width: 18 },
    { header: 'Payment Method', key: 'payment_method', width: 18 },
    { header: 'Description',    key: 'description',    width: 32 },
    { header: 'Recurring',      key: 'recurring',      width: 12 },
  ]

  const headerRow = ws.getRow(1)
  headerRow.font      = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7D9464' } }
  headerRow.alignment = { horizontal: 'center' }

  transactions.forEach(t => {
    const row = ws.addRow({
      date:           formatDate(t.date),
      type:           t.type,
      category:       t.category,
      amount:         t.amount,
      payment_method: t.payment_method || '',
      description:    t.description || '',
      recurring:      t.is_recurring ? 'Yes' : 'No',
    })
    // Color rows by type
    if (t.type === 'income') {
      row.getCell('amount').font  = { color: { argb: 'FF5A8A4A' } }
    } else {
      row.getCell('amount').font  = { color: { argb: 'FFC0614A' } }
    }
    row.getCell('amount').numFmt = '#,##0'
  })

  // Summary sheet
  const summaryWs = wb.addWorksheet('Summary')
  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  summaryWs.addRow(['Summary'])
  summaryWs.addRow(['Total Income',  income])
  summaryWs.addRow(['Total Expense', expense])
  summaryWs.addRow(['Net Balance',   income - expense])

  const buf = await wb.xlsx.writeBuffer()
  downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${filename}.xlsx`)
}

// ── PDF Export ────────────────────────────────────────────
export const exportToPDF = async (transactions, month, filename = 'evermore-report') => {
  const jsPDF  = (await import('jspdf')).default
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Header
  doc.setFillColor(163, 177, 138)
  doc.rect(0, 0, 297, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Evermore Finance Tracker', 14, 14)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Monthly Report · ${month}`, 14, 22)

  // Summary boxes
  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net     = income - expense

  doc.setTextColor(60, 60, 60)
  doc.setFontSize(10)
  const boxes = [
    { label: 'Total Income',  value: formatCurrency(income),  color: [90, 138, 74]   },
    { label: 'Total Expense', value: formatCurrency(expense), color: [192, 97, 74]   },
    { label: 'Net Balance',   value: formatCurrency(net),     color: [74, 122, 186]  },
  ]
  boxes.forEach((box, i) => {
    const x = 14 + i * 90
    doc.setFillColor(...box.color)
    doc.roundedRect(x, 32, 84, 18, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.text(box.label, x + 4, 39)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(box.value, x + 4, 47)
    doc.setFont('helvetica', 'normal')
  })

  // Table
  doc.autoTable({
    startY: 55,
    head: [['Date', 'Type', 'Category', 'Amount', 'Method', 'Description']],
    body: transactions.map(t => [
      formatDate(t.date, 'short'),
      t.type,
      t.category.replace('_', ' '),
      formatCurrency(t.amount),
      t.payment_method || '-',
      (t.description || '').substring(0, 40),
    ]),
    headStyles:  { fillColor: [163, 177, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 241, 233] },
    styles: { fontSize: 8, cellPadding: 2.5 },
  })

  // Footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Evermore Finance · Generated ${new Date().toLocaleDateString()} · Page ${i} of ${pageCount}`,
      14, doc.internal.pageSize.height - 6
    )
  }

  doc.save(`${filename}.pdf`)
}

// ── JSON Backup ───────────────────────────────────────────
export const exportToJSON = (data, filename = 'evermore-backup') => {
  const json = JSON.stringify(data, null, 2)
  downloadBlob(new Blob([json], { type: 'application/json' }), `${filename}.json`)
}

export const parseJSONImport = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try { resolve(JSON.parse(e.target.result)) }
      catch { reject(new Error('Invalid JSON file')) }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

// ── Helper ────────────────────────────────────────────────
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
