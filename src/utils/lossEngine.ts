import { Subscriber, LossAnalysis, SystemSettings } from '../types';

export function calculateTransformerLoss(
  transformer: any,
  subscribers: Subscriber[],
  settings?: SystemSettings
): LossAnalysis {
  const name = typeof transformer === 'string' ? transformer : transformer?.name || 'محول غير مسمى';
  const meterNumber = typeof transformer === 'object' ? transformer?.meterNumber || 'MTR-CENTRAL-01' : 'MTR-CENTRAL-01';
  const capacityKva = typeof transformer === 'object' ? Number(transformer?.capacityKva || 500) : 500;
  const zone = typeof transformer === 'object' ? transformer?.zone || 'المنطقة الرئيسية' : 'المنطقة الرئيسية';
  const prevReading = typeof transformer === 'object' ? Number(transformer?.previousMasterReading || 0) : 0;
  const currReading = typeof transformer === 'object' ? Number(transformer?.currentMasterReading || 0) : 0;
  const ctRatio = typeof transformer === 'object' ? Number(transformer?.ctRatio || 1) : 1;

  // Rate per kWh for calculating monetary value in Rials
  const kwhRate = settings?.tariffs?.residential || 250;

  // Central Master Consumption (kWh)
  const centralEnergyKwh = Math.max(0, (currReading - prevReading) * ctRatio);

  // Filter subscribers linked to this transformer
  const linkedSubs = subscribers.filter(s => (s.transformer || '').trim() === name.trim());
  const subscribersCount = linkedSubs.length;

  // Total sub-meters consumption
  const subMetersEnergyKwh = linkedSubs.reduce((sum, s) => {
    const cons = Math.max(0, (s.currentReading || 0) - (s.initialReading || 0));
    return sum + cons;
  }, 0);

  // Total Loss
  const totalLossKwh = Math.max(0, centralEnergyKwh - subMetersEnergyKwh);
  const totalLossPercent = centralEnergyKwh > 0 ? (totalLossKwh / centralEnergyKwh) * 100 : 0;
  const lossValueCurrency = totalLossKwh * kwhRate;

  // Technical vs Commercial Loss breakdown
  let technicalLossPercent = 0;
  let commercialLossPercent = 0;

  if (totalLossPercent <= 5) {
    technicalLossPercent = totalLossPercent;
    commercialLossPercent = 0;
  } else {
    technicalLossPercent = 4; // baseline technical cabling loss
    commercialLossPercent = Math.max(0, totalLossPercent - technicalLossPercent);
  }

  const technicalLossKwh = (centralEnergyKwh * technicalLossPercent) / 100;
  const commercialLossKwh = Math.max(0, totalLossKwh - technicalLossKwh);

  // Traffic Light Indicator & Status determination:
  // 🟢 أخضر (فاقد طبيعي): أقل من 5%
  // 🟡 أصفر (تنبيه): من 5% إلى 10%
  // 🔴 أحمر (خطر / تسريب مرتفع): أكثر من 10% (يتطلب نزول فريق تفتيش فني للمنطقة)
  let trafficLight: 'green' | 'yellow' | 'red' = 'green';
  let status: 'normal' | 'warning' | 'alert' = 'normal';
  let statusText = '🟢 أخضر (فاقد طبيعي < 5%)';
  let recommendation = 'حالة الشبكة والكابلات الفنية ممتازة وضمن النطاق الطبيعي المقبول.';

  if (totalLossPercent > 10) {
    trafficLight = 'red';
    status = 'alert';
    statusText = '🔴 أحمر (خطر / تسريب مرتفع > 10%)';
    recommendation = `🚨 خطر عاجل: بلغت نسبة الفاقد لكتلة المحول [${name}] (${totalLossPercent.toFixed(1)}%) ما يتجاوز 10%! يتطلب ذلك فوراً نزول فريق تفتيش فني للمنطقة لمراجعة التوصيلات والعدادات الفرعية لكشف السرقات.`;
  } else if (totalLossPercent >= 5) {
    trafficLight = 'yellow';
    status = 'warning';
    statusText = '🟡 أصفر (تنبيه فاقد مرتفع 5% - 10%)';
    recommendation = `تنبيه: نسبة الفاقد (${totalLossPercent.toFixed(1)}%) في النطاق الأصفر (5%-10%). يوصى بجدولة صيانة وقائية واختبار العدادات الفرعية.`;
  }

  return {
    transformerName: name,
    meterNumber,
    capacityKva,
    zone,
    prevReading,
    currReading,
    centralEnergyKwh,
    subMetersEnergyKwh,
    totalLossKwh,
    totalLossPercent,
    lossValueCurrency,
    technicalLossPercent,
    technicalLossKwh,
    commercialLossKwh,
    commercialLossPercent,
    trafficLight,
    status,
    statusText,
    subscribersCount,
    recommendation
  };
}
