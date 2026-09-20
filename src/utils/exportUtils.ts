import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';

export const exportToCSV = (data: any[], filename: string, columns?: { key: string, label: string }[]) => {
  if (!data || data.length === 0) return;
  
  const effectiveColumns = columns || Object.keys(data[0]).map(key => ({ key, label: key }));

  // Add BOM for Excel UTF-8 support
  let csvContent = '\uFEFF';
  
  // Headers
  csvContent += effectiveColumns.map(c => c.label).join(',') + '\n';
  
  // Data rows
  data.forEach(row => {
    const rowStr = effectiveColumns.map(c => {
      let val = row[c.key] ?? '';
      val = String(val).replace(/"/g, '""'); // escape quotes
      return `"${val}"`;
    }).join(',');
    csvContent += rowStr + '\n';
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const printData = (title: string, data: any[], columns: { key: string, label: string }[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    safePrint();
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          * { box-sizing: border-box; }
          body { 
            font-family: 'Cairo', sans-serif; 
            padding: 30px; 
            background-color: #ffffff;
            color: #0f172a;
          }
          h1 { 
            text-align: center; 
            color: #0f172a; 
            margin-bottom: 20px;
            font-size: 22px;
            font-weight: 800;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 15px; 
          }
          th, td { 
            border: 1px solid #cbd5e1; 
            padding: 8px 6px; 
            text-align: right; 
            font-size: 12px;
          }
          th { 
            background-color: #f1f5f9; 
            color: #1e293b; 
            font-weight: 700;
          }
          tr:nth-child(even) { 
            background-color: #f8fafc; 
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 11px;
            color: #64748b;
          }
          @media print {
            body { padding: 0; margin: 0; background: #fff; }
            button { display: none !important; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            @page { margin: 10mm; size: A4 portrait; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead>
            <tr>
              ${columns.map(c => `<th>${c.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${columns.map(c => `<td ${c.key === 'phone' ? 'dir="ltr" style="text-align: left;"' : ''}>${row[c.key] ?? ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          تمت الطباعة بواسطة نظام إدارة شبكات الكهرباء | ${new Date().toLocaleDateString('ar-YE')}
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
};

export interface PrintableReportConfig {
  title: string;
  companyName: string;
  companyPhone?: string;
  companyAddress?: string;
  subtitle?: string;
  badgeFilters?: { label: string; value: string }[];
  columns: { id: string; label: string; align?: 'right' | 'center' | 'left'; width?: string; isCurrency?: boolean }[];
  rows: any[][];
  summaryRow?: (string | number)[];
  orientation?: 'portrait' | 'landscape';
  showSignatures?: boolean;
  currency?: string;
  userName?: string;
  itemsPerPage?: number;
  totalsOnLastPageOnly?: boolean;
  fontSize?: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | number | string;
  tableDensity?: 'compact' | 'standard' | 'spacious';
  printTheme?: 'modern' | 'striped' | 'bordered' | 'minimal';
  fontFamily?: string;
  paperMargin?: 'compact' | 'standard' | 'spacious';
  showHeader?: boolean;
  showFilterBar?: boolean;
  showPageNumbers?: boolean;
  signers?: string[];
  customNote?: string;
}

export const generateReportHTML = (config: PrintableReportConfig): { html: string; totalPages: number; pagePrintWidth: string; pagePrintHeight: string; isLandscape: boolean } => {
  const {
    title,
    companyName,
    companyPhone = '',
    companyAddress = '',
    subtitle = '',
    badgeFilters = [],
    columns,
    rows,
    summaryRow,
    orientation = 'portrait',
    showSignatures = true,
    currency = 'ريال',
    userName = 'المسؤول',
    itemsPerPage = 14,
    totalsOnLastPageOnly = true,
    fontSize = 'medium',
    tableDensity = 'standard',
    printTheme = 'modern',
    fontFamily = 'Cairo',
    paperMargin = 'standard',
    showHeader = true,
    showFilterBar = true,
    showPageNumbers = true,
    signers = ['المحاسب المسؤول', 'أمين الصندوق / مسؤول التحصيل', 'المدير العام / الاعتماد'],
    customNote = ''
  } = config;

  // Split rows into page batches if itemsPerPage is specified
  const effectiveItemsPerPage = itemsPerPage && itemsPerPage > 0 ? itemsPerPage : (rows.length || 1);
  const totalPages = Math.max(1, Math.ceil(rows.length / effectiveItemsPerPage));
  const isLandscape = orientation === 'landscape';
  
  const pagesData: any[][][] = [];
  for (let i = 0; i < totalPages; i++) {
    pagesData.push(rows.slice(i * effectiveItemsPerPage, (i + 1) * effectiveItemsPerPage));
  }

  // Base dynamic scale factors based on items per page count (ISO A4 fitting)
  let baseFontSizeNum = 11;
  let thFontSizeNum = 11.5;
  let cellPaddingYNum = 5;
  let cellPaddingXNum = 5;
  let headerTitleSize = '17px';
  let headerSubSize = '10.5px';
  let docTitleSize = '13px';
  let headerMarginBottom = '8px';
  let headerPaddingBottom = '6px';
  let filterPadding = '4px 8px';
  let filterFontSize = '9.5px';
  let filterMarginBottom = '6px';
  let sigMarginTop = '16px';
  let sigLineMargin = '20px';
  let sigFontSize = '10px';
  let footerMarginTop = '8px';
  let footerFontSize = '8.5px';
  let footerPaddingTop = '4px';
  let rowLineHeight = '1.3';

  if (effectiveItemsPerPage <= 10) {
    baseFontSizeNum = isLandscape ? 10.5 : 11.5;
    thFontSizeNum = isLandscape ? 11 : 12;
    cellPaddingYNum = isLandscape ? 5 : 8;
    cellPaddingXNum = 6;
    headerTitleSize = '18px';
    headerMarginBottom = '10px';
    headerPaddingBottom = '8px';
    filterPadding = '6px 10px';
    filterFontSize = '10.5px';
    filterMarginBottom = '10px';
    sigMarginTop = '24px';
    sigLineMargin = '28px';
  } else if (effectiveItemsPerPage <= 14) {
    baseFontSizeNum = isLandscape ? 9.5 : 10.5;
    thFontSizeNum = isLandscape ? 10 : 11;
    cellPaddingYNum = isLandscape ? 4 : 6;
    cellPaddingXNum = 5;
    headerTitleSize = '17px';
    headerMarginBottom = '8px';
    headerPaddingBottom = '6px';
    filterPadding = '5px 8px';
    filterFontSize = '10px';
    filterMarginBottom = '8px';
    sigMarginTop = '18px';
    sigLineMargin = '22px';
  } else if (effectiveItemsPerPage <= 18) {
    baseFontSizeNum = isLandscape ? 8.5 : 9.5;
    thFontSizeNum = isLandscape ? 9 : 10;
    cellPaddingYNum = isLandscape ? 3 : 4.5;
    cellPaddingXNum = 4.5;
    headerTitleSize = '16px';
    headerSubSize = '10px';
    docTitleSize = '12px';
    headerMarginBottom = '6px';
    headerPaddingBottom = '4px';
    filterPadding = '4px 7px';
    filterFontSize = '9px';
    filterMarginBottom = '6px';
    sigMarginTop = '14px';
    sigLineMargin = '18px';
    sigFontSize = '9.5px';
    footerMarginTop = '8px';
  } else if (effectiveItemsPerPage <= 25) {
    baseFontSizeNum = isLandscape ? 8 : 9;
    thFontSizeNum = isLandscape ? 8.5 : 9.5;
    cellPaddingYNum = isLandscape ? 2 : 3.5;
    cellPaddingXNum = 4;
    headerTitleSize = '15px';
    headerSubSize = '9px';
    docTitleSize = '11.5px';
    headerMarginBottom = '5px';
    headerPaddingBottom = '4px';
    filterPadding = '3px 6px';
    filterFontSize = '8.5px';
    filterMarginBottom = '5px';
    sigMarginTop = '10px';
    sigLineMargin = '14px';
    sigFontSize = '9px';
    footerMarginTop = '6px';
    footerFontSize = '8px';
    rowLineHeight = '1.2';
  } else if (effectiveItemsPerPage <= 35) {
    baseFontSizeNum = isLandscape ? 7 : 8;
    thFontSizeNum = isLandscape ? 7.5 : 8.5;
    cellPaddingYNum = isLandscape ? 1.5 : 2.5;
    cellPaddingXNum = 3;
    headerTitleSize = '13.5px';
    headerSubSize = '8px';
    docTitleSize = '10.5px';
    headerMarginBottom = '4px';
    headerPaddingBottom = '3px';
    filterPadding = '2px 5px';
    filterFontSize = '8px';
    filterMarginBottom = '4px';
    sigMarginTop = '8px';
    sigLineMargin = '10px';
    sigFontSize = '8px';
    footerMarginTop = '5px';
    footerFontSize = '7.5px';
    rowLineHeight = '1.15';
  } else {
    baseFontSizeNum = 7.2;
    thFontSizeNum = 7.8;
    cellPaddingYNum = 1;
    cellPaddingXNum = 2.5;
    headerTitleSize = '12px';
    headerSubSize = '7.5px';
    docTitleSize = '9.5px';
    headerMarginBottom = '3px';
    headerPaddingBottom = '2px';
    filterPadding = '1.5px 4px';
    filterFontSize = '7px';
    filterMarginBottom = '3px';
    sigMarginTop = '6px';
    sigLineMargin = '8px';
    sigFontSize = '7.5px';
    footerMarginTop = '4px';
    footerFontSize = '7px';
    rowLineHeight = '1.1';
  }

  // Apply User Font Size Customization
  if (typeof fontSize === 'number') {
    baseFontSizeNum = fontSize;
    thFontSizeNum = fontSize + 0.5;
  } else if (typeof fontSize === 'string') {
    if (fontSize === 'xsmall') {
      baseFontSizeNum *= 0.82;
      thFontSizeNum *= 0.85;
    } else if (fontSize === 'small') {
      baseFontSizeNum *= 0.92;
      thFontSizeNum *= 0.94;
    } else if (fontSize === 'large') {
      baseFontSizeNum *= 1.15;
      thFontSizeNum *= 1.15;
    } else if (fontSize === 'xlarge') {
      baseFontSizeNum *= 1.3;
      thFontSizeNum *= 1.3;
    } else if (fontSize.endsWith('px')) {
      const parsed = parseFloat(fontSize);
      if (!isNaN(parsed) && parsed > 0) {
        baseFontSizeNum = parsed;
        thFontSizeNum = parsed + 0.5;
      }
    }
  }

  // Apply Table Density Customization
  if (tableDensity === 'compact') {
    cellPaddingYNum = Math.max(1, cellPaddingYNum * 0.65);
    rowLineHeight = '1.15';
  } else if (tableDensity === 'spacious') {
    cellPaddingYNum = cellPaddingYNum * 1.4;
    rowLineHeight = '1.4';
  }

  const baseFontSize = `${baseFontSizeNum.toFixed(1)}px`;
  const thFontSize = `${thFontSizeNum.toFixed(1)}px`;
  const cellPaddingY = `${cellPaddingYNum.toFixed(1)}px`;
  const cellPaddingX = `${cellPaddingXNum.toFixed(1)}px`;

  // Theme-specific styles
  const isMinimal = printTheme === 'minimal';
  const isBordered = printTheme === 'bordered';
  const isStriped = printTheme === 'striped';
  const tableBorderColor = isMinimal ? '#000000' : isBordered ? '#1e293b' : '#94a3b8';
  const theadBg = isMinimal ? '#ffffff' : '#f1f5f9';
  const theadColor = '#0f172a';
  const zebraBg = isMinimal ? '#ffffff' : isStriped ? '#f1f5f9' : '#f8fafc';

  const pagePrintHeight = isLandscape ? '198mm' : '285mm';
  const pagePrintWidth = isLandscape ? '287mm' : '200mm';

  const pagePrintMargin = paperMargin === 'compact' ? '4mm' : paperMargin === 'spacious' ? '10mm' : '6mm';
  const resolvedFontFamily = fontFamily === 'Tajawal' ? "'Tajawal', sans-serif" :
    fontFamily === 'Almarai' ? "'Almarai', sans-serif" :
    fontFamily === 'IBM Plex Sans Arabic' ? "'IBM Plex Sans Arabic', sans-serif" :
    fontFamily === 'Amiri' ? "'Amiri', serif" :
    "'Cairo', system-ui, -apple-system, sans-serif";

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <title>${title} - ${companyName}</title>
        <meta charset="utf-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          html, body { 
            font-family: ${resolvedFontFamily}; 
            background-color: #f1f5f9;
            color: #0f172a;
            direction: rtl;
            text-align: right;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }
          body {
            padding: 16px 0;
          }
          .report-page-card {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 14px 18px;
            margin: 0 auto 20px auto;
            width: ${pagePrintWidth};
            max-width: 100%;
            min-height: ${pagePrintHeight};
            height: ${pagePrintHeight};
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .report-page-card:last-child {
            page-break-after: auto;
            break-after: auto;
            margin-bottom: 0;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: ${headerPaddingBottom};
            margin-bottom: ${headerMarginBottom};
            flex-shrink: 0;
          }
          .header-right h1 {
            font-size: ${headerTitleSize};
            font-weight: 900;
            color: #0f172a;
            margin: 0 0 2px 0;
            line-height: 1.2;
          }
          .header-right p {
            font-size: ${headerSubSize};
            color: #334155;
            margin: 1px 0;
            font-weight: 600;
            line-height: 1.2;
          }
          .header-left {
            text-align: left;
            font-size: ${headerSubSize};
            color: #334155;
            direction: rtl;
            line-height: 1.2;
            flex-shrink: 0;
          }
          .header-left .doc-title {
            font-size: ${docTitleSize};
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 2px;
          }
          .page-tag {
            display: inline-block;
            background: #0f172a;
            color: #ffffff;
            padding: 1px 6px;
            border-radius: 4px;
            font-size: ${headerSubSize};
            font-weight: 800;
            margin-top: 2px;
          }
          .filter-bar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: ${filterPadding};
            margin-bottom: ${filterMarginBottom};
            font-size: ${filterFontSize};
            font-weight: 700;
            color: #1e293b;
            flex-shrink: 0;
          }
          .filter-item {
            background-color: #ffffff;
            border: 1px solid #cbd5e1;
            padding: 1px 5px;
            border-radius: 3px;
          }
          .table-wrapper {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            min-height: 0;
            margin: 2px 0;
          }
          table { 
            width: 100%; 
            height: 100%;
            border-collapse: collapse; 
            font-size: ${baseFontSize};
            line-height: ${rowLineHeight};
            flex: 1 1 auto;
          }
          tbody {
            height: 100%;
          }
          th, td { 
            border: 1px solid ${tableBorderColor}; 
            padding: ${cellPaddingY} ${cellPaddingX}; 
            vertical-align: middle;
          }
          th { 
            background-color: ${theadBg}; 
            color: ${theadColor}; 
            font-weight: 800;
            font-size: ${thFontSize};
            height: 24px;
          }
          tr:nth-child(even) { 
            background-color: ${zebraBg}; 
          }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .num-font { font-family: monospace, 'Cairo', sans-serif; font-weight: 700; }
          .overdue-col { color: ${isMinimal ? '#000000' : '#b91c1c'}; font-weight: 800; }
          .due-col { color: ${isMinimal ? '#000000' : '#b45309'}; font-weight: 800; }
          .total-col { color: ${isMinimal ? '#000000' : '#0369a1'}; font-weight: 900; }
          .collected-col { color: ${isMinimal ? '#000000' : '#15803d'}; font-weight: 800; }
          tfoot tr td {
            background-color: ${isMinimal ? '#ffffff' : '#e2e8f0'};
            color: #0f172a;
            font-weight: 900;
            border-top: 2px solid #0f172a;
            font-size: ${thFontSize};
            height: 24px;
          }
          .bottom-section {
            flex-shrink: 0;
          }
          .custom-note-block {
            margin-top: 6px;
            padding: 4px 8px;
            background-color: #f8fafc;
            border: 1px dashed #cbd5e1;
            border-radius: 4px;
            font-size: 9px;
            color: #334155;
            font-weight: 600;
          }
          .signatures-block {
            display: flex;
            justify-content: space-between;
            margin-top: ${sigMarginTop};
            padding-top: 4px;
            border-top: 1px dashed #94a3b8;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .sig-box {
            text-align: center;
            font-size: ${sigFontSize};
            font-weight: 700;
            color: #1e293b;
            flex: 1;
            max-width: 30%;
          }
          .sig-line {
            margin-top: ${sigLineMargin};
            border-bottom: 1px solid #0f172a;
          }
          .print-footer {
            margin-top: ${footerMarginTop};
            text-align: center;
            font-size: ${footerFontSize};
            color: #64748b;
            font-weight: 600;
            border-top: 1px solid #e2e8f0;
            padding-top: ${footerPaddingTop};
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .no-print-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #0f172a;
            color: #ffffff;
            padding: 10px 16px;
            border-radius: 8px;
            margin: 0 auto 16px auto;
            width: ${pagePrintWidth};
            max-width: 100%;
          }
          .btn-print {
            background-color: #f59e0b;
            color: #0f172a;
            border: none;
            padding: 8px 18px;
            border-radius: 6px;
            font-weight: 800;
            font-family: inherit;
            cursor: pointer;
            font-size: 13px;
          }
          @media print {
            @page { 
              margin: ${pagePrintMargin}; 
              size: A4 ${orientation}; 
            }
            html, body { 
              padding: 0 !important; 
              margin: 0 !important; 
              background: #ffffff !important; 
              width: 100% !important; 
              height: 100% !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print-toolbar { display: none !important; }
            .report-page-card {
              box-shadow: none !important;
              border-radius: 0 !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              height: ${pagePrintHeight} !important;
              min-height: ${pagePrintHeight} !important;
              max-height: ${pagePrintHeight} !important;
              background: #ffffff !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              page-break-after: always !important;
              break-after: page !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
            }
            .report-page-card:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-toolbar">
          <div>
            <strong>${title}</strong> — معاينة (${totalPages} صفحات A4 كاملة • ${effectiveItemsPerPage} مشترك بالصفحة)
          </div>
          <button class="btn-print" onclick="window.print()">طباعة / حفظ كـ PDF 🖨️</button>
        </div>

        ${pagesData.map((pageRows, pageIndex) => {
          const pageNum = pageIndex + 1;
          const isLastPage = pageNum === totalPages;
          const shouldShowSummary = isLastPage || !totalsOnLastPageOnly;

          return `
            <div class="report-page-card">
              ${showHeader ? `
                <div class="header">
                  <div class="header-right">
                    <h1>${companyName}</h1>
                    ${companyPhone || companyAddress ? `<p>${companyPhone ? `هاتف: ${companyPhone}` : ''} ${companyAddress ? `• العنوان: ${companyAddress}` : ''}</p>` : ''}
                    <p>${subtitle || 'إدارة الحسابات والتحصيل • نظام الفوترة الرقمية'}</p>
                  </div>
                  <div class="header-left">
                    <div class="doc-title">${title}</div>
                    <div>تاريخ الكشف: ${new Date().toLocaleDateString('ar-YE', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    <div>المسؤول: ${userName}</div>
                    ${showPageNumbers ? `<div class="page-tag">صفحة ${pageNum} من ${totalPages}</div>` : ''}
                  </div>
                </div>
              ` : ''}

              ${showFilterBar && badgeFilters.length > 0 ? `
                <div class="filter-bar">
                  ${badgeFilters.map(f => `
                    <div class="filter-item"><strong>${f.label}:</strong> ${f.value}</div>
                  `).join('')}
                  <div class="filter-item" style="margin-right: auto;"><strong>مشتركي هذه الصفحة:</strong> ${pageRows.length} (إجمالي الكشف: ${rows.length})</div>
                </div>
              ` : ''}

              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      ${columns.map(col => `
                        <th class="${col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'}" style="${col.width ? `width: ${col.width};` : ''}">
                          ${col.label} ${col.isCurrency ? `(${currency})` : ''}
                        </th>
                      `).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    ${pageRows.map((row) => `
                      <tr>
                        ${row.map((cell, cIdx) => {
                          const col = columns[cIdx];
                          const alignClass = col?.align === 'center' ? 'text-center' : col?.align === 'left' ? 'text-left' : 'text-right';
                          const isSpecial = col?.id === 'overdueAmount' ? 'overdue-col' : col?.id === 'currentDue' ? 'due-col' : col?.id === 'totalDue' ? 'total-col' : col?.id === 'totalCollected' ? 'collected-col' : '';
                          const isPhone = col?.id === 'phone';
                          return `<td class="${alignClass} ${isSpecial} num-font" ${isPhone ? 'dir="ltr"' : ''}>${cell ?? ''}</td>`;
                        }).join('')}
                      </tr>
                    `).join('')}
                  </tbody>
                  ${shouldShowSummary && summaryRow && summaryRow.length > 0 ? `
                    <tfoot>
                      <tr>
                        ${summaryRow.map((cell, cIdx) => {
                          const col = columns[cIdx];
                          const alignClass = col?.align === 'center' ? 'text-center' : col?.align === 'left' ? 'text-left' : 'text-right';
                          return `<td class="${alignClass} num-font">${cell ?? ''}</td>`;
                        }).join('')}
                      </tr>
                    </tfoot>
                  ` : ''}
                </table>
              </div>

              <div class="bottom-section">
                ${customNote ? `
                  <div class="custom-note-block">
                    <strong>تنبيه / ملاحظة هامة:</strong> ${customNote}
                  </div>
                ` : ''}

                ${isLastPage && showSignatures ? `
                  <div class="signatures-block">
                    ${signers.map(signerTitle => `
                      <div class="sig-box">
                        <div>${signerTitle}</div>
                        <div class="sig-line"></div>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}

                <div class="print-footer">
                  تم استخراج وطباعة هذا الكشف رسمياً عبر نظام إدارة وتوزيع الكهرباء والطاقة | ${showPageNumbers ? `صفحة ${pageNum} من ${totalPages} | ` : ''}${new Date().toLocaleDateString('ar-YE')}
                </div>
              </div>
            </div>
          `;
        }).join('')}

        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 350);
          };
        </script>
      </body>
    </html>
  `;

  return { html, totalPages, pagePrintWidth, pagePrintHeight, isLandscape };
};

export const printOrSaveReportPDF = (config: PrintableReportConfig) => {
  const { html } = generateReportHTML(config);

  // Use an invisible iframe for completely reliable printing in sandboxed or new tab environments
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('title', 'Print Preview Frame');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print failed, falling back to window.open', err);
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(html);
          win.document.close();
        }
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1500);
      }
    }, 450);
  } else {
    // Fallback to new window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  }
};

/**
 * Direct file download as PDF (.pdf) without requiring printer dialog
 */
export const downloadDirectPDF = async (
  config: PrintableReportConfig, 
  customFilename?: string
): Promise<void> => {
  const { html, isLandscape } = generateReportHTML(config);
  const pdfOrientation = isLandscape ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation: pdfOrientation,
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pdfWidth = isLandscape ? 297 : 210;
  const pdfHeight = isLandscape ? 210 : 297;

  // Create an isolated sandboxed iframe to prevent html2canvas from parsing parent Tailwind oklch styles
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-99999px';
  iframe.style.left = '-99999px';
  iframe.style.width = isLandscape ? '1120px' : '820px';
  iframe.style.height = isLandscape ? '790px' : '1100px';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('تعذر تهيئة بيئة تصدير ملف PDF');
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Allow iframe DOM and fonts to settle cleanly
    if (iframeDoc.fonts && iframeDoc.fonts.ready) {
      await iframeDoc.fonts.ready.catch(() => {});
    }
    await new Promise(resolve => setTimeout(resolve, 350));

    const pageCards = iframeDoc.querySelectorAll('.report-page-card');
    if (!pageCards || pageCards.length === 0) {
      throw new Error('تعذر توليد صفحات التقرير');
    }

    for (let i = 0; i < pageCards.length; i++) {
      const card = pageCards[i] as HTMLElement;

      // Render to image using html-to-image with skipFonts to avoid remote fetch errors in sandboxed environments
      const imgData = await toJpeg(card, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: false,
        skipFonts: true,
        fontEmbedCSS: ''
      });

      if (i > 0) {
        doc.addPage('a4', pdfOrientation);
      }

      const marginX = 4;
      const marginY = 4;
      const targetWidth = pdfWidth - (marginX * 2);
      const targetHeight = pdfHeight - (marginY * 2);

      doc.addImage(imgData, 'JPEG', marginX, marginY, targetWidth, targetHeight, undefined, 'FAST');
    }

    const defaultFilename = `${(config.title || 'report').replace(/\s+/g, '_')}_${new Date().toISOString().substring(0, 10)}.pdf`;
    doc.save(customFilename || defaultFilename);
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
};

export const safePrint = (elementId?: string) => {
  try {
    if (typeof window !== 'undefined') {
      window.focus();
      setTimeout(() => {
        window.print();
      }, 100);
    }
  } catch (err) {
    console.error("Print failed", err);
    alert("عذراً، تعذر تشغيل أمر الطباعة المباشر. يرجى فتح التطبيق في نافذة مستقلة للطباعة.");
  }
};
