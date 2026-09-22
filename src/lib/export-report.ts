import {summarize,progress,fmt,monthLabel,FIELDS,type Data,type Filters} from './model';

function downloadBlob(blob:Blob,name:string){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}

export async function generateReportBlob(
  data: Data,
  filters: Filters,
  notes: string,
  format: 'pdf' | 'xlsx',
  demo = false
): Promise<{ blob: Blob; fileName: string; mimeType: string }> {
  const s = summarize(data, filters);
  const month = filters.month === 'all' ? 'All months' : monthLabel(filters.month);
  const title = (demo ? 'SAMPLE — ' : '') + 'Dlbeen Influencers Report';
  const creator = filters.influencer === 'all' ? 'All influencers' : String(data.influencers.find((i) => i.id === filters.influencer)?.name || 'Selected influencer');
  const scope = month + ' · ' + (filters.brand === 'all' ? 'All brands' : filters.brand) + ' · ' + creator + ' · ' + filters.currency;
  const name = (demo ? 'SAMPLE_' : '') + 'Dlbeen_Influencers_' + filters.month + '_' + filters.currency;
  const influence = (id: unknown) => String(data.influencers.find((i) => i.id === id)?.name || 'Unknown');

  const summary = [
    ['Period', month],
    ['Brand', filters.brand === 'all' ? 'All brands' : filters.brand],
    ['Currency', filters.currency],
    ['Influencer', creator],
    ['Agreements', s.agreements.length],
    ['Agreed content', s.agreed],
    ['Delivered against commitment', s.credited],
    ['Remaining content', s.remaining],
    ['Published content', s.published.length],
    ['Committed fees', s.fee],
    ['Reported reach (sum)', s.reach],
    ['Views', s.views],
    ['Likes', s.add('likes')],
    ['Comments', s.add('comments')],
    ['Shares', s.add('shares')],
    ['Saves', s.add('saves')],
    ['Attributed followers', s.followers],
    ['Link clicks', s.add('clicks')],
    ['Leads', s.add('leads')],
    ['Orders', s.add('orders')],
    ['Attributed revenue', s.add('revenue')],
    ['Engagement rate (%)', s.er ?? 'Unreported'],
    ['Cost per engagement', s.cpe ?? 'Unavailable'],
    ['Cost per follower', s.cpf ?? 'Unavailable'],
    ['Revenue / committed fees', s.roas ?? 'Unavailable'],
    ['Items with full ER metrics', s.coverage],
    ['Overdue agreements', s.overdue.length],
  ];

  const methodology =
    'Grouped by agreement month. Published content only. Each story frame counts as one item. Delivery is capped separately by format. Reach is summed and is not deduplicated. Engagement rate uses only content with complete reach, likes, comments, shares and saves. Follower gains, orders and revenue are manually attributed. Fees include unpaid commitments. Missing metrics are unreported, not measured zero. CPE and cost per follower use reported totals. IQD and USD remain separate.';

  const agreementHeaders = [
    'Influencer',
    'Month',
    'Brand',
    'Campaign',
    'Stories agreed',
    'Stories done',
    'Reels agreed',
    'Reels done',
    'Posts agreed',
    'Posts done',
    'Remaining',
    'Fee',
    'Currency',
    'Payment',
    'Renewal',
    'Due date',
  ];

  const agreementRows = s.agreements.map((a) => {
    const p = progress(a, data.content);
    return [
      influence(a.influencer_id),
      a.month,
      a.brand,
      a.campaign || '',
      p.rows[0].agreed,
      p.rows[0].done,
      p.rows[1].agreed,
      p.rows[1].done,
      p.rows[2].agreed,
      p.rows[2].done,
      p.remaining,
      a.fee,
      a.currency,
      a.payment_status,
      a.renewal,
      a.due_date,
    ];
  });

  if (format === 'xlsx') {
    const ExcelJSModule = await import('exceljs');
    const ExcelJS = ExcelJSModule.default ?? ExcelJSModule;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Dlbeen Group';
    workbook.created = new Date();

    function sheet(sheetName: string, head: string[], rows: any[][]) {
      const ws = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 4 }] });
      ws.mergeCells(1, 1, 1, Math.min(head.length, 6));
      ws.getCell('A1').value = title;
      ws.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF0649D9' } };
      ws.mergeCells(2, 1, 2, Math.min(head.length, 6));
      ws.getCell('A2').value = scope;
      ws.getCell('A2').font = { size: 11, color: { argb: 'FF7A8CA6' } };
      ws.getRow(4).values = head;
      ws.getRow(4).height = 30;
      ws.getRow(4).eachCell((c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF104FCB' } };
        c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        c.alignment = { vertical: 'middle', wrapText: true };
      });
      rows.forEach((row, j) => {
        const r = ws.getRow(j + 5);
        r.values = row.map((v) => v ?? '');
        r.height = 23;
        r.eachCell((c) => {
          c.font = { size: 11, color: { argb: 'FF314665' } };
          if (j % 2 === 0) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F6FC' } };
          c.alignment = { vertical: 'middle' };
        });
      });
      ws.columns.forEach((c, j) => {
        c.width = j === 0 ? 28 : Math.max(16, Math.min(30, head[j].length + 4));
      });
      ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: head.length } };
      return ws;
    }

    sheet('Summary', ['Metric', 'Result'], summary);
    sheet('Agreement results', agreementHeaders, agreementRows);
    const influencerIds = new Set(s.agreements.map((a) => a.influencer_id));
    sheet(
      'Influencers',
      [...FIELDS.influencers],
      data.influencers.filter((i) => influencerIds.has(i.id)).map((i) => FIELDS.influencers.map((k) => i[k] ?? ''))
    );
    sheet(
      'Content',
      ['Influencer', 'Brand', 'Agreement month', ...FIELDS.content],
      s.content.map((c) => {
        const a = data.agreements.find((a) => a.id === c.agreement_id);
        return [influence(a?.influencer_id), a?.brand, a?.month, ...FIELDS.content.map((k) => c[k] ?? '')];
      })
    );
    const ws = sheet(
      'Notes & definitions',
      ['Section', 'Details'],
      [
        ['Manager notes', notes || 'No additional notes.'],
        ['Measurement basis', methodology],
        ['Data', demo ? 'FICTIONAL SAMPLE DATA' : 'User-entered creator insights and attributed results'],
        ['Generated', new Date().toISOString()],
      ]
    );
    ws.getColumn(2).width = 110;
    ws.getColumn(2).alignment = { wrapText: true, vertical: 'top' };
    ws.getRow(5).height = Math.min(180, 35 + notes.length / 3);
    ws.getRow(6).height = 115;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return { blob, fileName: name + '.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }

  // PDF Export
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const font = await fetch('/fonts/DejaVuSans.ttf').then((r) => r.arrayBuffer());
  let binary = '';
  new Uint8Array(font).forEach((v) => (binary += String.fromCharCode(v)));
  doc.addFileToVFS('DejaVuSans.ttf', btoa(binary));
  doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal');
  doc.setFont('DejaVu');
  doc.setFillColor('#0649db');
  doc.rect(0, 0, 297, 4, 'F');
  doc.setTextColor('#173662');
  doc.setFontSize(21);
  doc.text(title, 15, 22);
  doc.setFontSize(10);
  doc.setTextColor('#6d819e');
  doc.text(scope, 15, 31);
  doc.setFontSize(8);
  doc.text('Generated ' + new Date().toLocaleDateString('en-GB'), 282, 31, { align: 'right' });

  const common: any = {
    styles: { font: 'DejaVu', fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: '#1455cd', fontStyle: 'normal' },
    alternateRowStyles: { fillColor: '#f2f6fd' },
    margin: { left: 15, right: 15, top: 18, bottom: 17 },
  };

  autoTable(doc, {
    ...common,
    startY: 39,
    head: [['Agreements', 'Delivered / agreed', 'Remaining', 'Reach (sum)', 'Followers gained', 'Committed fees']],
    body: [[s.agreements.length, `${s.credited} / ${s.agreed}`, s.remaining, fmt(s.reach), fmt(s.followers), fmt(s.fee) + ' ' + filters.currency]],
  });

  let y = (doc as any).lastAutoTable.finalY + 10;
  doc.setTextColor('#173662');
  doc.setFontSize(12);
  doc.text('Partnership results', 15, y);
  autoTable(doc, {
    ...common,
    startY: y + 5,
    head: [['Influencer', 'Brand', 'Stories', 'Reels', 'Posts', 'Remaining', 'Fee (' + filters.currency + ')', 'Renewal']],
    body: s.agreements.map((a) => {
      const p = progress(a, data.content);
      return [influence(a.influencer_id), a.brand, ...p.rows.map((r) => r.done + ' / ' + r.agreed), p.remaining, fmt(Number(a.fee) || 0), a.renewal || 'Maybe'];
    }),
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  if (y > 140) {
    doc.addPage();
    y = 20;
  }
  doc.setTextColor('#173662');
  doc.setFontSize(12);
  doc.text('Performance', 15, y);
  autoTable(doc, {
    ...common,
    startY: y + 5,
    head: [['Views', 'Likes', 'Comments', 'Shares', 'Saves', 'Engagement rate', 'Cost / engagement']],
    body: [
      [
        fmt(s.views),
        fmt(s.add('likes')),
        fmt(s.add('comments')),
        fmt(s.add('shares')),
        fmt(s.add('saves')),
        s.er === null ? 'Unreported' : s.er.toFixed(2) + '%',
        s.cpe === null ? '—' : fmt(s.cpe) + ' ' + filters.currency,
      ],
    ],
  });

  doc.addPage();
  doc.setFontSize(16);
  doc.setTextColor('#173662');
  doc.text('Content results', 15, 21);
  autoTable(doc, {
    ...common,
    startY: 28,
    head: [['Creator / content', 'Format', 'Status', 'Reach', 'Views', 'Likes', 'Comments', 'Shares', 'Saves', 'New followers']],
    body: s.content.map((c) => {
      const a = data.agreements.find((a) => a.id === c.agreement_id);
      return [
        influence(a?.influencer_id) + '\n' + c.title,
        c.format,
        c.status,
        ...['reach', 'views', 'likes', 'comments', 'shares', 'saves', 'followers_gained'].map((k) =>
          c[k] == null || c[k] === '' ? '—' : fmt(Number(c[k]))
        ),
      ];
    }),
  });

  doc.addPage();
  doc.setFontSize(16);
  doc.text('Marketing outcomes & notes', 15, 21);
  autoTable(doc, {
    ...common,
    startY: 29,
    head: [['Link clicks', 'Leads', 'Orders', 'Attributed revenue', 'Cost / follower', 'Revenue / committed fees']],
    body: [
      [
        fmt(s.add('clicks')),
        fmt(s.add('leads')),
        fmt(s.add('orders')),
        fmt(s.add('revenue')) + ' ' + filters.currency,
        s.cpf === null ? '—' : fmt(s.cpf) + ' ' + filters.currency,
        s.roas === null ? '—' : s.roas.toFixed(2) + '×',
      ],
    ],
  });
  autoTable(doc, {
    ...common,
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Section', 'Details']],
    body: [
      ['Manager notes', notes || 'No additional notes.'],
      ['Metric coverage', s.coverage + ' of ' + s.published.length + ' published items have complete engagement-rate inputs.'],
      ['Definitions', methodology],
      ['Data source', demo ? 'Fictional sample records. Not Dlbeen campaign results.' : 'Manually entered influencer insights and attributed results.'],
    ],
  });

  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor('#8b9ab0');
    doc.text('DLBEEN GROUP · Influencers System', 15, 201);
    doc.text(`${p} / ${doc.getNumberOfPages()}`, 282, 201, { align: 'right' });
  }

  const pdfBlob = doc.output('blob');
  return { blob: pdfBlob, fileName: name + '.pdf', mimeType: 'application/pdf' };
}

export async function exportReport(
  data: Data,
  filters: Filters,
  notes: string,
  format: 'pdf' | 'xlsx',
  demo = false
) {
  const { blob, fileName } = await generateReportBlob(data, filters, notes, format, demo);
  downloadBlob(blob, fileName);
}

