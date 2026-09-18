import { SystemSettings, TariffType } from '../../types';

export interface BillCalculationResult {
  kwhBilled: number;
  ratePerKwh: number;
  energyCost: number;
  fixedFee: number;
  serviceFee: number;
  cleaningFee: number;
  streetLightFee: number;
  meterRentalFee: number;
  peakSurcharge: number;
  subtotalBeforeTax: number;
  taxPercent: number;
  taxAmount: number;
  grossTotal: number;
  effectiveRatePerKwh: number;
  calculationMethod: 'flat' | 'tiered_progressive' | 'tiered_total_bracket';
  slicesBreakdown: Array<{
    sliceName: string;
    kwhUsed: number;
    ratePerKwh: number;
    fixedFee: number;
    totalAmount: number;
  }>;
}

export function getSectorTariffRate(tariffType: TariffType | undefined, settings: SystemSettings): number {
  if (!settings || !settings.tariffs) return 0;
  const t = tariffType || 'residential';
  const residentialRate = settings.tariffs.residential ?? 0;
  switch (t) {
    case 'residential':
      return settings.tariffs.residential ?? 0;
    case 'commercial':
      return settings.tariffs.commercial ?? residentialRate;
    case 'industrial':
      return settings.tariffs.industrial ?? residentialRate;
    case 'government':
      return settings.tariffs.government ?? settings.tariffs.commercial ?? residentialRate;
    case 'agricultural':
      return settings.tariffs.agricultural ?? residentialRate;
    case 'mosque':
      return settings.tariffs.mosque ?? residentialRate;
    case 'other':
      return settings.tariffs.other ?? residentialRate;
    default:
      return settings.tariffs.residential ?? 0;
  }
}

export function calculateBillDetails(
  consumptionKwh: number,
  tariffType: TariffType | undefined,
  settings: SystemSettings,
  options?: {
    isPeak?: boolean;
    hasMeterRental?: boolean;
  }
): BillCalculationResult {
  const method = settings?.tariffCalculationMethod || 'flat';
  const baseSectorRate = getSectorTariffRate(tariffType, settings);
  const minKwh = settings?.minMonthlyConsumptionKwh || 0;
  const kwhBilled = Math.max(consumptionKwh, minKwh);

  let energyCost = 0;
  const slicesBreakdown: BillCalculationResult['slicesBreakdown'] = [];

  const activeSlices = (settings?.tariffSlices || []).filter(
    s => s.category === 'all' || s.category === tariffType
  );

  if (method === 'tiered_progressive' && activeSlices.length > 0) {
    let remaining = kwhBilled;
    for (const slice of activeSlices) {
      if (remaining <= 0) break;
      const min = slice.minKwh;
      const max = slice.maxKwh;
      const capacity = max !== null ? Math.max(0, max - min) : Infinity;
      const usedInSlice = Math.min(remaining, capacity);

      if (usedInSlice > 0) {
        const sliceAmt = usedInSlice * slice.ratePerKwh + (slice.fixedAdditionalFee || 0);
        slicesBreakdown.push({
          sliceName: slice.name,
          kwhUsed: usedInSlice,
          ratePerKwh: slice.ratePerKwh,
          fixedFee: slice.fixedAdditionalFee || 0,
          totalAmount: sliceAmt
        });
        energyCost += sliceAmt;
        remaining -= usedInSlice;
      }
    }
    // Overflow handling if consumption exceeds defined slices
    if (remaining > 0) {
      const overflowAmt = remaining * baseSectorRate;
      slicesBreakdown.push({
        sliceName: 'فائض أعلى من الشرائح',
        kwhUsed: remaining,
        ratePerKwh: baseSectorRate,
        fixedFee: 0,
        totalAmount: overflowAmt
      });
      energyCost += overflowAmt;
    }
  } else if (method === 'tiered_total_bracket' && activeSlices.length > 0) {
    const matchedSlice = activeSlices.find(s => {
      const min = s.minKwh;
      const max = s.maxKwh;
      if (max === null) return kwhBilled >= min;
      return kwhBilled >= min && kwhBilled < max;
    }) || activeSlices[activeSlices.length - 1];

    const rate = matchedSlice ? matchedSlice.ratePerKwh : baseSectorRate;
    const additional = matchedSlice ? (matchedSlice.fixedAdditionalFee || 0) : 0;
    energyCost = kwhBilled * rate + additional;
    slicesBreakdown.push({
      sliceName: matchedSlice ? matchedSlice.name : 'الشريحة المطبقة',
      kwhUsed: kwhBilled,
      ratePerKwh: rate,
      fixedFee: additional,
      totalAmount: energyCost
    });
  } else {
    // Flat Rate
    energyCost = kwhBilled * baseSectorRate;
    slicesBreakdown.push({
      sliceName: 'تعرفة السعر الموحد',
      kwhUsed: kwhBilled,
      ratePerKwh: baseSectorRate,
      fixedFee: 0,
      totalAmount: energyCost
    });
  }

  // Peak Hours Surcharge
  let peakSurcharge = 0;
  if (options?.isPeak && settings?.touEnabled && settings?.peakMultiplier && settings.peakMultiplier > 1) {
    peakSurcharge = energyCost * (settings.peakMultiplier - 1);
  }

  // Itemized Fees
  const fixedFee = settings?.fixedFee || 0;
  const serviceFee = settings?.serviceFee || 0;
  const cleaningFee = settings?.cleaningFee || 0;
  const streetLightFee = settings?.streetLightFee || 0;
  const meterRentalFee = options?.hasMeterRental ? (settings?.meterRentalFee || 0) : 0;

  const subtotalBeforeTax = energyCost + peakSurcharge + fixedFee + serviceFee + cleaningFee + streetLightFee + meterRentalFee;
  const taxPercent = settings?.taxPercent || 0;
  const taxAmount = (subtotalBeforeTax * taxPercent) / 100;
  const grossTotal = Number((subtotalBeforeTax + taxAmount).toFixed(2));
  const effectiveRatePerKwh = kwhBilled > 0 ? grossTotal / kwhBilled : baseSectorRate;

  return {
    kwhBilled,
    ratePerKwh: baseSectorRate,
    energyCost,
    fixedFee,
    serviceFee,
    cleaningFee,
    streetLightFee,
    meterRentalFee,
    peakSurcharge,
    subtotalBeforeTax,
    taxPercent,
    taxAmount,
    grossTotal,
    effectiveRatePerKwh,
    calculationMethod: method,
    slicesBreakdown
  };
}
