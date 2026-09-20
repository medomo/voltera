import React, { useState } from 'react';
import { 
  Eye, ChevronRight, ChevronLeft, Printer, FileDown, ArrowLeft, 
  ZoomIn, ZoomOut, Maximize2, SlidersHorizontal 
} from 'lucide-react';
import { SubscriberBalanceItem, ColumnDefinition, SummaryStatistics } from './types';
import { SystemSettings } from '../../types';

interface LiveSheetPreviewProps {
  items: SubscriberBalanceItem[];
  columns: ColumnDefinition[];
  rowsPerPage: number;
  currentPageIndex: number;
  onPageChange: (idx: number) => void;
  printFontFamily: string;
  paperMargin: 'compact' | 'standard' | 'spacious';
  printFontSize: string;
  customFontSizePx: number;
  tableDensity: string;
  printTheme: string;
  printOrientation: 'portrait' | 'landscape';
  showHeader: boolean;
  showFilterBar: boolean;
  showPageNumbers: boolean;
  totalsOnLastPageOnly: boolean;
  showSignatures: boolean;
  signer1: string;
  signer2: string;
  signer3: string;
  customPrintNote: string;
  summaryStats: SummaryStatistics;
  settings: SystemSettings;
  onExitPreview: () => void;
  onPrint: () => void;
  onExportPDF: () => void;
  isExportingPDF: boolean;
  onTogglePrintStudio?: () => void;
}

export const LiveSheetPreview: React.FC<LiveSheetPreviewProps> = ({
  items,
  columns,
  rowsPerPage,
  currentPageIndex,
  onPageChange,
  printFontFamily,
  paperMargin,
  printFontSize,
  customFontSizePx,
  tableDensity,
  printTheme,
  printOrientation,
  showHeader,
  showFilterBar,
  showPageNumbers,
  totalsOnLastPageOnly,
  showSignatures,
  signer1,
  signer2,
  signer3,
  customPrintNote,
  summaryStats,
  settings,
  onExitPreview,
  onPrint,
  onExportPDF,
  isExportingPDF,
  onTogglePrintStudio
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const visibleColumns = columns.filter(c => c.visible);
  const totalPages = Math.max(1, Math.ceil(items.length / Math.max(1, rowsPerPage)));
  const safePageIndex = Math.min(currentPageIndex, totalPages - 1);
  const pageItems = items.slice(safePageIndex * rowsPerPage, (safePageIndex + 1) * rowsPerPage);
  const isLastPage = safePageIndex === totalPages - 1;
  const showTotals = totalsOnLastPageOnly ? isLastPage : true;

  const currency = settings.currency || 'ريال';
  const stationName = settings.stationName || settings.companyName || 'محطة الكهرباء التجارية';

  // Table padding class
  const getCellPadding = () => {
    switch (tableDensity) {
      case 'compact': return 'py-1 px-1.5';
      case 'spacious': return 'py-2.5 px-3';
      case 'standard':
      default: return 'py-1.5 px-2';
    }
  };

  // Font size calculation for sheet
  const getTableFontSizeStyle = () => {
    switch (printFontSize) {
      case 'xsmall': return { fontSize: '10px', lineHeight: '1.2' };
      case 'small': return { fontSize: '11px', lineHeight: '1.25' };
      case 'large': return { fontSize: '13.5px', lineHeight: '1.35' };
      case 'xlarge': return { fontSize: '15px', lineHeight: '1.4' };
      case 'custom': return { fontSize: `${Math.max(8, customFontSizePx)}px`, lineHeight: '1.3' };
      case 'medium':
      default: return { fontSize: '12px', lineHeight: '1.3' };
    }
  };

  // Theme styling helpers
  const isMinimal = printTheme === 'minimal';
  const isStriped = printTheme === 'striped';
  const isBordered = printTheme === 'bordered';

  const resolvedFontFamily = printFontFamily === 'Tajawal' ? "'Tajawal', sans-serif" :
    printFontFamily === 'Almarai' ? "'Almarai', sans-serif" :
    printFontFamily === 'IBM Plex Sans Arabic' ? "'IBM Plex Sans Arabic', sans-serif" :
    printFontFamily === 'Amiri' ? "'Amiri', serif" :
    "'Cairo', system-ui, -apple-system, sans-serif";

  const paperPaddingClass = paperMargin === 'compact' ? 'p-3 sm:p-5' : paperMargin === 'spacious' ? 'p-6 sm:p-12' : 'p-4 sm:p-8 md:p-10';

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 print:hidden">
      {/* Top Preview Control Bar */}
      <div className="bg-slate-950/95 border border-amber-500/30 p-3 sm:p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xl backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-white flex flex-wrap items-center gap-2">
              <span>معاينة حية لصفحات الطباعة (A4 Live Sheet)</span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md text-[11px] font-mono">
                {printOrientation === 'landscape' ? 'أفقي A4' : 'عمودي A4'} • {rowsPerPage} مشترك/صفحة • خط: {printFontFamily}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 font-bold hidden sm:block">
              تطابق تماماً مخرجات الطابعة وملف الـ PDF مع الحجم والكثافة المختارة
            </p>
          </div>
        </div>

        {/* Page Nav & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Print Studio Toggle Button */}
          {onTogglePrintStudio && (
            <button
              type="button"
              onClick={onTogglePrintStudio}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="تعديل أحجام الخطوط والكثافة والهوامش"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>تخصيص الاستوديو</span>
            </button>
          )}

          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(50, prev - 15))}
              className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              title="تصغير المعاينة"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-slate-300 font-bold">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(150, prev + 15))}
              className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              title="تكبير المعاينة"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomLevel !== 100 && (
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className="text-[10px] text-amber-400 hover:underline px-1 cursor-pointer"
              >
                100%
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(0, safePageIndex - 1))}
              disabled={safePageIndex === 0}
              className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 hover:bg-slate-800 rounded-lg cursor-pointer"
              title="الصفحة السابقة"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="px-2.5 py-1 text-xs font-black text-white font-mono flex items-center gap-1">
              <span>صفحة</span>
              <span className="text-amber-400">{safePageIndex + 1}</span>
              <span>من</span>
              <span>{totalPages}</span>
            </div>

            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages - 1, safePageIndex + 1))}
              disabled={safePageIndex >= totalPages - 1}
              className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 hover:bg-slate-800 rounded-lg cursor-pointer"
              title="الصفحة التالية"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onExportPDF}
            disabled={isExportingPDF}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">تصدير PDF</span>
            <span className="xs:hidden">PDF</span>
          </button>

          <button
            type="button"
            onClick={onPrint}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
          </button>

          <button
            type="button"
            onClick={onExitPreview}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">رجوع للجدول</span>
          </button>
        </div>
      </div>

      {/* Realistic A4 White Paper Canvas with responsive overflow container and zoom */}
      <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
        <div 
          style={{ 
            transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined, 
            transformOrigin: 'top center',
            fontFamily: resolvedFontFamily
          }}
          className={`mx-auto bg-white text-slate-950 shadow-2xl rounded-sm ${paperPaddingClass} border border-slate-300 transition-transform ${
            printOrientation === 'landscape' ? 'min-w-[750px] max-w-5xl min-h-[500px]' : 'min-w-[600px] max-w-3xl min-h-[750px]'
          }`}
        >
          {/* Header */}
          {showHeader && (
            <div className="border-b-2 border-slate-900 pb-3 mb-3 flex justify-between items-start">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-950">{stationName}</h2>
                <p className="text-xs font-bold text-slate-600">كشف مطالبات ومستحقات ومحصلي المشتركين</p>
                {settings.phone && <p className="text-[10px] text-slate-500">هاتف: {settings.phone} {settings.address ? `• العنوان: ${settings.address}` : ''}</p>}
              </div>
              <div className="text-left text-xs font-bold text-slate-700">
                <p>تاريخ الإصدار: {new Date().toLocaleDateString('ar-YE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                {showPageNumbers && (
                  <p className="text-[11px] font-mono mt-1 text-slate-900 font-black bg-slate-100 px-2 py-0.5 rounded inline-block border border-slate-300">
                    صفحة ({safePageIndex + 1}) من ({totalPages})
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Filter Bar Badge preview on Sheet */}
          {showFilterBar && (
            <div className="bg-slate-50 border border-slate-200 rounded p-1.5 mb-3 flex flex-wrap items-center justify-between text-[10px] font-bold text-slate-700">
              <div className="flex items-center gap-2">
                <span className="bg-white border border-slate-300 px-1.5 py-0.5 rounded">
                  <strong>عدد مشتركي التقرير:</strong> {items.length} مشترك
                </span>
                <span className="bg-white border border-slate-300 px-1.5 py-0.5 rounded">
                  <strong>مشتركي هذه الصفحة:</strong> {pageItems.length} مشترك
                </span>
              </div>
              <span className="text-slate-500">نظام إدارة وتوزيع الطاقة الكهربائية</span>
            </div>
          )}

          {/* The Table with Live Font Size and Theme */}
          <div className="overflow-x-auto" style={getTableFontSizeStyle()}>
            <table className={`w-full border-collapse border ${isBordered ? 'border-slate-900' : 'border-slate-400'} text-center font-sans`}>
              <thead>
                <tr className={`${isMinimal ? 'bg-white border-b-2 border-slate-900 text-black' : 'bg-slate-100 text-slate-950 border-b-2 border-slate-900'} font-black`}>
                  {visibleColumns.map(col => (
                    <th key={col.id} className={`border ${isBordered ? 'border-slate-800' : 'border-slate-400'} p-1.5 whitespace-nowrap`}>
                      {col.label} {col.isCurrency ? `(${currency})` : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {pageItems.map((item, idx) => {
                  const globalIdx = safePageIndex * rowsPerPage + idx + 1;
                  const rowBg = isMinimal ? 'bg-white' : isStriped ? (idx % 2 === 1 ? 'bg-slate-100' : 'bg-white') : (idx % 2 === 1 ? 'bg-slate-50' : 'bg-white');

                  return (
                    <tr key={item.meterNumber} className={rowBg}>
                      {visibleColumns.map(col => {
                        let val: React.ReactNode = '';
                        switch (col.id) {
                          case 'index': val = globalIdx; break;
                          case 'meterNumber': val = <span className="font-mono font-bold">{item.meterNumber}</span>; break;
                          case 'name': val = <span className="font-bold text-right block truncate max-w-[160px]">{item.name}</span>; break;
                          case 'phone': val = <span className="font-mono" dir="ltr">{item.phone || '-'}</span>; break;
                          case 'zone': val = item.zone || '-'; break;
                          case 'transformer': val = item.transformer || '-'; break;
                          case 'tariffType': val = item.tariffType; break;
                          case 'openingBalance': val = item.openingBalance.toLocaleString(); break;
                          case 'totalBilled': val = item.totalBilled.toLocaleString(); break;
                          case 'totalCollected': val = <span className={!isMinimal ? 'text-emerald-700 font-bold' : 'font-bold'}>{item.totalCollected.toLocaleString()}</span>; break;
                          case 'collectionRate': val = `${item.collectionRate}%`; break;
                          case 'overdueAmount': val = <span className={`font-mono font-bold ${!isMinimal ? 'text-rose-700' : ''}`}>{item.overdueAmount.toLocaleString()}</span>; break;
                          case 'currentDue': val = <span className={`font-mono font-bold ${!isMinimal ? 'text-amber-700' : ''}`}>{item.currentDue.toLocaleString()}</span>; break;
                          case 'totalDue': val = <span className={`font-mono font-black ${!isMinimal ? 'text-sky-800' : ''}`}>{item.totalDue.toLocaleString()}</span>; break;
                          case 'paymentStatusLabel': val = item.paymentStatusLabel; break;
                          case 'lastPaymentDate': val = item.lastPaymentDate; break;
                          case 'lastReadingDate': val = item.lastReadingDate; break;
                          case 'lastConsumption': val = item.lastConsumption ? `${item.lastConsumption} ك.و` : '-'; break;
                          case 'collectorName': val = <span className="font-bold text-slate-800">{item.collectorName || '-'}</span>; break;
                          case 'lastPaymentAmount': val = item.lastPaymentAmount ? item.lastPaymentAmount.toLocaleString() : '-'; break;
                          case 'fieldPaid': val = <div className="min-w-[65px] h-4.5 border-b border-dashed border-slate-600 mx-auto" />; break;
                          case 'receiptNumber': val = <div className="min-w-[55px] h-4.5 border-b border-dashed border-slate-600 mx-auto" />; break;
                          case 'subscriberSignature': val = <div className="min-w-[75px] h-4.5 border-b border-dashed border-slate-600 mx-auto" />; break;
                          case 'status': val = item.status; break;
                          case 'notes': val = <div className="min-w-[80px] h-4 border-b border-dotted border-slate-400" />; break;
                          default: val = '-';
                        }

                        return (
                          <td key={col.id} className={`border ${isBordered ? 'border-slate-800' : 'border-slate-300'} ${getCellPadding()} whitespace-nowrap`}>
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals on Last Page / All Pages based on setting */}
              {showTotals && (
                <tfoot className={`${isMinimal ? 'bg-white' : 'bg-slate-200'} text-slate-950 font-black border-t-2 border-slate-900`}>
                  <tr>
                    {visibleColumns.map((col, idx) => {
                      if (idx === 0) return <td key={col.id} className={`border ${isBordered ? 'border-slate-800' : 'border-slate-400'} p-1.5 font-bold`}>الإجمالي</td>;
                      if (col.id === 'openingBalance') return <td key={col.id} className={`border ${isBordered ? 'border-slate-800' : 'border-slate-400'} p-1.5 font-mono`}>{summaryStats.totalOpening.toLocaleString()}</td>;
                      if (col.id === 'totalBilled') return <td key={col.id} className={`border ${isBordered ? 'border-slate-800' : 'border-slate-400'} p-1.5 font-mono`}>{summaryStats.totalBilled.toLocaleString()}</td>;
                      if (col.id === 'totalCollected') return <td key={col.id} className={`border ${isBordered ? 'border-slate-800' : 'border-slate-400'} p-1.5 font-mono`}>{summaryStats.totalCollected.toLocaleString()}</td>;
                      if (col.id === 'overdueAmount') return <td key={col.id} className={`border ${isBordered ? 'border-slate-800' : 'border-slate-400'} p-1.5 font-mono`}>{summaryStats.totalOverdue.toLocaleString()}</td>;
                      if (col.id === 'currentDue') return <td key={col.id} className={`border ${isBordered ? 'border-slate-800' : 'border-slate-400'} p-1.5 font-mono`}>{summaryStats.totalCurrentDue.toLocaleString()}</td>;
                      if (col.id === 'totalDue') return <td key={col.id} className={`border ${isBordered ? 'border-slate-800' : 'border-slate-400'} p-1.5 font-mono font-black`}>{summaryStats.totalDueSum.toLocaleString()}</td>;
                      if (col.id === 'collectionRate') return <td key={col.id} className={`border ${isBordered ? 'border-slate-800' : 'border-slate-400'} p-1.5 font-mono`}>{summaryStats.overallCollectionRate}%</td>;
                      return <td key={col.id} className={`border ${isBordered ? 'border-slate-800' : 'border-slate-400'} p-1.5`}>{idx === 1 ? `(${items.length} مشترك)` : ''}</td>;
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Note */}
          {customPrintNote && (
            <div className="mt-3 text-[10px] text-slate-700 bg-slate-50 border-r-4 border-slate-800 p-2 rounded-r">
              <strong>تنبيه / ملاحظة رسمية:</strong> {customPrintNote}
            </div>
          )}

          {/* Signatures on Last Page */}
          {showSignatures && isLastPage && (
            <div className="grid grid-cols-3 gap-4 mt-8 pt-4 border-t border-slate-400 text-center text-[10px] font-bold text-slate-900">
              <div>
                <p className="mb-6">{signer1 || 'مسؤول التحصيل الميداني'}</p>
                <p className="border-t border-dotted border-slate-600 pt-1">التوقيع: ................................</p>
              </div>
              <div>
                <p className="mb-6">{signer2 || 'المحاسب المالي'}</p>
                <p className="border-t border-dotted border-slate-600 pt-1">التوقيع: ................................</p>
              </div>
              <div>
                <p className="mb-6">{signer3 || 'المدير العام / الاعتماد'}</p>
                <p className="border-t border-dotted border-slate-600 pt-1">الختم والتوقيع: ................................</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
