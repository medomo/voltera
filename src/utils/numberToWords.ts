/**
 * Helper utility to convert numeric currency values into Arabic text (Tafqeet / تفقيط المبالغ المالية)
 * Useful for official thermal receipts and invoices.
 */

const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const HUNDREDS = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

function convertUnderThousand(num: number): string {
  if (num === 0) return '';
  let result = '';

  const hundredsDigit = Math.floor(num / 100);
  const remainder = num % 100;

  if (hundredsDigit > 0) {
    result += HUNDREDS[hundredsDigit];
  }

  if (remainder > 0) {
    if (result) result += ' و';
    if (remainder < 20) {
      result += ONES[remainder];
    } else {
      const onesDigit = remainder % 10;
      const tensDigit = Math.floor(remainder / 10);
      if (onesDigit > 0) {
        result += ONES[onesDigit] + ' و' + TENS[tensDigit];
      } else {
        result += TENS[tensDigit];
      }
    }
  }

  return result;
}

export function tafqeetArabic(amount: number, currencyName: string = 'ريال يمني'): string {
  if (!amount || isNaN(amount) || amount === 0) return `صفر ${currencyName} فقط لا غير`;
  
  const absoluteAmount = Math.abs(amount);
  const integerPart = Math.floor(absoluteAmount);
  const decimalPart = Math.round((absoluteAmount - integerPart) * 100);

  let parts: string[] = [];

  const billions = Math.floor(integerPart / 1_000_000_000);
  const millions = Math.floor((integerPart % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((integerPart % 1_000_000) / 1_000);
  const subThousand = integerPart % 1_000;

  if (billions > 0) {
    if (billions === 1) parts.push('مليار');
    else if (billions === 2) parts.push('ملياران');
    else if (billions >= 3 && billions <= 10) parts.push(`${convertUnderThousand(billions)} مليارات`);
    else parts.push(`${convertUnderThousand(billions)} مليار`);
  }

  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(`${convertUnderThousand(millions)} ملايين`);
    else parts.push(`${convertUnderThousand(millions)} مليون`);
  }

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(`${convertUnderThousand(thousands)} آلاف`);
    else parts.push(`${convertUnderThousand(thousands)} ألف`);
  }

  if (subThousand > 0) {
    parts.push(convertUnderThousand(subThousand));
  }

  let text = parts.join(' و ');
  if (!text) text = 'صفر';

  let fullText = `فقط ${text} ${currencyName}`;
  if (decimalPart > 0) {
    fullText += ` و ${convertUnderThousand(decimalPart)} فلساً`;
  }
  fullText += ' لا غير';

  return fullText;
}
