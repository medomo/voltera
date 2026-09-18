/**
 * Helper utilities for 10-day field reading cycles (نظام أخذ القراءات كل 10 أيام - 3 نزولات شهرياً)
 */

export interface DecadalPeriodInfo {
  decadeIndex: 1 | 2 | 3;
  decadeName: string;
  decadeShort: string;
  rangeText: string;
  currentDayOfMonth: number;
}

export function getDecadalPeriodInfo(dateInput?: Date | string): DecadalPeriodInfo {
  let dateObj = new Date();
  if (dateInput) {
    if (typeof dateInput === 'string') {
      const parsed = new Date(dateInput.replace(' ', 'T'));
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      }
    } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      dateObj = dateInput;
    }
  }

  const day = dateObj.getDate();

  if (day <= 10) {
    return {
      decadeIndex: 1,
      decadeName: 'العشرية الأولى (النزول الميداني الأول: 1 - 10)',
      decadeShort: 'العشرية الأولى (1 - 10)',
      rangeText: 'الأيام 1 إلى 10 من الشهر',
      currentDayOfMonth: day
    };
  } else if (day <= 20) {
    return {
      decadeIndex: 2,
      decadeName: 'العشرية الثانية (النزول الميداني الثاني: 11 - 20)',
      decadeShort: 'العشرية الثانية (11 - 20)',
      rangeText: 'الأيام 11 إلى 20 من الشهر',
      currentDayOfMonth: day
    };
  } else {
    return {
      decadeIndex: 3,
      decadeName: 'العشرية الثالثة (النزول الميداني الثالث: 21 - 30/31)',
      decadeShort: 'العشرية الثالثة (21 - 30)',
      rangeText: 'الأيام 21 إلى نهاية الشهر',
      currentDayOfMonth: day
    };
  }
}

export interface ReadingCycleStatus {
  daysElapsed: number | null;
  isDue: boolean;
  statusText: string;
  badgeClass: string;
  indicatorSymbol: string;
}

export function getReadingCycleStatus(
  lastReadingDateStr?: string,
  targetIntervalDays: number = 10
): ReadingCycleStatus {
  if (!lastReadingDateStr) {
    return {
      daysElapsed: null,
      isDue: true,
      statusText: 'عداد جديد - مستحق القراءة فوراً',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      indicatorSymbol: '🟢'
    };
  }

  try {
    const lastTime = new Date(lastReadingDateStr.replace(' ', 'T')).getTime();
    const nowTime = new Date().getTime();
    if (isNaN(lastTime)) throw new Error('Invalid date');

    const diffMs = nowTime - lastTime;
    const daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (daysElapsed >= targetIntervalDays) {
      return {
        daysElapsed,
        isDue: true,
        statusText: `مستحق القراءة (مرّت ${daysElapsed} أيام من آخر دورة)`,
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        indicatorSymbol: '🟢'
      };
    } else {
      const remainingDays = targetIntervalDays - daysElapsed;
      return {
        daysElapsed,
        isDue: false,
        statusText: `تم أخذ القراءة قبل ${daysElapsed} أيام (باقي ${remainingDays} أيام على الدورة القادمة)`,
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        indicatorSymbol: '🟡'
      };
    }
  } catch (e) {
    return {
      daysElapsed: null,
      isDue: true,
      statusText: 'تاريخ القراءة غير محدد - مستحق',
      badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      indicatorSymbol: '⚪'
    };
  }
}
