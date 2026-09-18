import { SystemSettings, ConsumptionSliceTier, TariffType } from '../types';

export interface SliceCalculationResult {
  sliceId: string;
  sliceName: string;
  minKwh: number;
  maxKwh: number | null;
  kwhUsed: number;
  ratePerKwh: number;
  additionalFee: number;
  energyAmount: number;
  totalSliceAmount: number;
  color?: string;
}

export interface BillCalculationBreakdown {
  kwhBilled: number;
  kwhOriginal: number;
  isMinConsumptionApplied: boolean;
  minConsumptionKwh: number;
  sector: string;
  calculationMethod: 'flat' | 'tiered_progressive' | 'tiered_total_bracket';
  baseRatePerKwh: number;
  slices: SliceCalculationResult[];
  energyTotal: number;
  
  // Fees Breakdown
  fixedFee: number;
  serviceFee: number;
  cleaningFee: number;
  streetLightFee: number;
  meterRentalFee: number;
  totalItemizedFees: number;

  // Time of Use (Peak) Surcharge
  touApplied: boolean;
  peakMultiplier: number;
  peakSurcharge: number;

  // Subtotal, Tax & Gross Total
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  grossTotal: number;
  effectiveRatePerKwh: number;
}

/**
 * Calculates a detailed electricity bill breakdown based on station settings, consumption, sector, and optional flags.
 */
export function calculateDetailedBill(
  rawKwh: number,
  sector: string = 'residential',
  settings: SystemSettings,
  options: {
    isDuringPeakHours?: boolean;
    hasMeterRental?: boolean;
    includeCleaningFee?: boolean;
    includeStreetLightFee?: boolean;
  } = {}
): BillCalculationBreakdown {
  const kwhOriginal = Math.max(0, rawKwh || 0);
  const minKwh = settings.minMonthlyConsumptionKwh || 0;
  const isMinConsumptionApplied = kwhOriginal < minKwh && minKwh > 0;
  const kwhBilled = isMinConsumptionApplied ? minKwh : kwhOriginal;

  const method = settings.tariffCalculationMethod || 'flat';
  const tariffs = settings.tariffs || { residential: 0, commercial: 0, industrial: 0 };
  
  // Base rate for the given sector
  const residentialRate = tariffs.residential ?? 0;
  let sectorRate = (tariffs as Record<string, number | undefined>)[sector] ?? residentialRate;
  if (sectorRate === undefined || sectorRate === null) {
    sectorRate = residentialRate;
  }

  const slicesList: ConsumptionSliceTier[] = (settings.tariffSlices && settings.tariffSlices.length > 0)
    ? settings.tariffSlices
    : [];

  const calculatedSlices: SliceCalculationResult[] = [];
  let energyTotal = 0;

  if (method === 'flat') {
    // 1. Flat Rate per sector
    const amount = kwhBilled * sectorRate;
    energyTotal = amount;
    calculatedSlices.push({
      sliceId: 'flat-rate',
      sliceName: `تعرفة القطاع الموحدة (${sector === 'residential' ? 'سكني' : sector === 'commercial' ? 'تجاري' : sector === 'industrial' ? 'صناعي' : sector === 'government' ? 'حكومي' : sector === 'agricultural' ? 'زراعي' : sector === 'mosque' ? 'مساجد/خيري' : 'عام'})`,
      minKwh: 0,
      maxKwh: null,
      kwhUsed: kwhBilled,
      ratePerKwh: sectorRate,
      additionalFee: 0,
      energyAmount: amount,
      totalSliceAmount: amount,
      color: 'amber',
    });
  } else if (method === 'tiered_progressive') {
    // 2. Progressive Tiered Slices (Block Rate)
    // Filter slices applicable to this sector (or 'all')
    const applicableSlices = slicesList
      .filter(s => s.category === 'all' || s.category === sector)
      .sort((a, b) => a.minKwh - b.minKwh);

    if (applicableSlices.length === 0) {
      // Fallback to flat if no slices match
      const amount = kwhBilled * sectorRate;
      energyTotal = amount;
      calculatedSlices.push({
        sliceId: 'flat-fallback',
        sliceName: 'تعرفة موحدة',
        minKwh: 0,
        maxKwh: null,
        kwhUsed: kwhBilled,
        ratePerKwh: sectorRate,
        additionalFee: 0,
        energyAmount: amount,
        totalSliceAmount: amount,
        color: 'amber',
      });
    } else {
      let remainingKwh = kwhBilled;

      for (let i = 0; i < applicableSlices.length; i++) {
        const slice = applicableSlices[i];
        const sliceMin = slice.minKwh;
        const sliceMax = slice.maxKwh;

        let sliceCapacity: number;
        if (sliceMax !== null && sliceMax !== undefined) {
          // If first slice (0 to 100), capacity is 100. If 101 to 300, capacity is 200.
          sliceCapacity = Math.max(0, sliceMax - Math.max(0, sliceMin - 1));
        } else {
          sliceCapacity = Infinity;
        }

        const kwhInThisSlice = Math.min(remainingKwh, sliceCapacity);

        if (kwhInThisSlice > 0 || (i === 0 && kwhBilled === 0)) {
          const sliceRate = slice.ratePerKwh > 0 ? slice.ratePerKwh : sectorRate;
          const sliceEnergyAmount = kwhInThisSlice * sliceRate;
          const addFee = slice.fixedAdditionalFee || 0;
          const totalSliceAmount = sliceEnergyAmount + addFee;

          energyTotal += totalSliceAmount;

          calculatedSlices.push({
            sliceId: slice.id,
            sliceName: slice.name,
            minKwh: slice.minKwh,
            maxKwh: slice.maxKwh,
            kwhUsed: kwhInThisSlice,
            ratePerKwh: sliceRate,
            additionalFee: addFee,
            energyAmount: sliceEnergyAmount,
            totalSliceAmount: totalSliceAmount,
            color: slice.color || (i === 0 ? 'emerald' : i === 1 ? 'amber' : 'rose'),
          });

          remainingKwh -= kwhInThisSlice;
          if (remainingKwh <= 0) break;
        }
      }
    }
  } else if (method === 'tiered_total_bracket') {
    // 3. Full-Consumption Bracket Tier (all kWh billed at the bracket's rate)
    const applicableSlices = slicesList
      .filter(s => s.category === 'all' || s.category === sector)
      .sort((a, b) => a.minKwh - b.minKwh);

    let matchingSlice = applicableSlices.find(s => {
      if (s.maxKwh !== null && s.maxKwh !== undefined) {
        return kwhBilled >= s.minKwh && kwhBilled <= s.maxKwh;
      }
      return kwhBilled >= s.minKwh;
    }) || applicableSlices[applicableSlices.length - 1];

    if (!matchingSlice) {
      const amount = kwhBilled * sectorRate;
      energyTotal = amount;
      calculatedSlices.push({
        sliceId: 'flat-bracket-fallback',
        sliceName: 'شريحة موحدة',
        minKwh: 0,
        maxKwh: null,
        kwhUsed: kwhBilled,
        ratePerKwh: sectorRate,
        additionalFee: 0,
        energyAmount: amount,
        totalSliceAmount: amount,
        color: 'amber',
      });
    } else {
      const bracketRate = matchingSlice.ratePerKwh > 0 ? matchingSlice.ratePerKwh : sectorRate;
      const bracketEnergyAmount = kwhBilled * bracketRate;
      const addFee = matchingSlice.fixedAdditionalFee || 0;
      energyTotal = bracketEnergyAmount + addFee;

      calculatedSlices.push({
        sliceId: matchingSlice.id,
        sliceName: matchingSlice.name,
        minKwh: matchingSlice.minKwh,
        maxKwh: matchingSlice.maxKwh,
        kwhUsed: kwhBilled,
        ratePerKwh: bracketRate,
        additionalFee: addFee,
        energyAmount: bracketEnergyAmount,
        totalSliceAmount: energyTotal,
        color: matchingSlice.color || 'amber',
      });
    }
  }

  // Peak / Time of Use Calculation
  let touApplied = false;
  let peakMultiplier = 1;
  let peakSurcharge = 0;

  if (settings.touEnabled && options.isDuringPeakHours) {
    touApplied = true;
    peakMultiplier = settings.peakMultiplier || 1.25;
    const additionalFactor = Math.max(0, peakMultiplier - 1);
    peakSurcharge = energyTotal * additionalFactor;
    energyTotal += peakSurcharge;
  }

  // Itemized System Fees
  const fixedFee = Math.max(0, settings.fixedFee ?? 1000);
  const serviceFee = Math.max(0, settings.serviceFee ?? 500);
  const cleaningFee = options.includeCleaningFee !== false ? Math.max(0, settings.cleaningFee ?? 200) : 0;
  const streetLightFee = options.includeStreetLightFee !== false ? Math.max(0, settings.streetLightFee ?? 100) : 0;
  const meterRentalFee = options.hasMeterRental ? Math.max(0, settings.meterRentalFee ?? 300) : 0;

  const totalItemizedFees = fixedFee + serviceFee + cleaningFee + streetLightFee + meterRentalFee;

  const subtotal = energyTotal + totalItemizedFees;
  const taxPercent = Math.max(0, settings.taxPercent ?? 5);
  const taxAmount = subtotal * (taxPercent / 100);
  const grossTotal = subtotal + taxAmount;

  const effectiveRatePerKwh = kwhBilled > 0 ? grossTotal / kwhBilled : 0;

  return {
    kwhBilled,
    kwhOriginal,
    isMinConsumptionApplied,
    minConsumptionKwh: minKwh,
    sector,
    calculationMethod: method,
    baseRatePerKwh: sectorRate,
    slices: calculatedSlices,
    energyTotal,
    fixedFee,
    serviceFee,
    cleaningFee,
    streetLightFee,
    meterRentalFee,
    totalItemizedFees,
    touApplied,
    peakMultiplier,
    peakSurcharge,
    subtotal,
    taxPercent,
    taxAmount,
    grossTotal,
    effectiveRatePerKwh,
  };
}
