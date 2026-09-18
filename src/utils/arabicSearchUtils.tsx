import React from 'react';

/**
 * Normalizes Arabic text for flexible search comparison:
 * - Unifies all Alef variants (أ, إ, آ, ٱ -> ا)
 * - Unifies Taa Marbuta & Haa (ة -> ه)
 * - Unifies Yaa & Alef Maksura (ى, ئ -> ي)
 * - Unifies Waw with Hamza (ؤ -> و)
 * - Removes Arabic Tashkeel / Harakat (َ ً ُ ٌ ِ ٍ ّ ْ ٰ)
 * - Removes Tatweel / Kashida (ـ)
 * - Converts Arabic-Indic digits (٠-٩) to Standard digits (0-9)
 */
export const normalizeArabicText = (text: string = ''): string => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // remove tashkeel & Quranic marks
    .replace(/[\u0640]/g, '') // remove tatweel / kashida
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .trim();
};

/**
 * Normalizes meter numbers and codes (removes spaces, dashes, leading zeros, handles Arabic-Indic digits)
 */
export const normalizeMeterNumber = (meter: string = ''): string => {
  if (!meter) return '';
  const converted = meter.toString().replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
  return converted.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

/**
 * Normalizes phone numbers (handles international codes, removes country prefixes, removes non-digit characters)
 */
export const normalizePhoneNumber = (phone: string = ''): string => {
  if (!phone) return '';
  let clean = phone.toString().replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
  clean = clean.replace(/[^0-9]/g, '');
  // Remove country prefixes for Yemen (967) or general 00967 if present
  if (clean.startsWith('00967')) clean = clean.substring(5);
  else if (clean.startsWith('967')) clean = clean.substring(3);
  // Remove leading zeros for flexible matching (e.g. 077 -> 77)
  if (clean.startsWith('0')) clean = clean.substring(1);
  return clean;
};

export type SearchScope = 'all' | 'name' | 'meter' | 'phone' | 'zone' | 'code';

export interface SearchMatchResult {
  isMatch: boolean;
  score: number;
  matchedField?: 'meter' | 'name' | 'phone' | 'code' | 'zone' | 'notes';
  matchedTokens?: string[];
}

/**
 * Evaluates whether a subscriber matches a search query with score ranking and field attribution
 */
export const matchSubscriberSearch = (
  subscriber: {
    name?: string;
    meterNumber?: string;
    phone?: string;
    subscriberCode?: string;
    accountNumber?: string;
    zone?: string;
    transformer?: string;
    notes?: string;
    address?: string;
    nationalId?: string;
  },
  query: string,
  scope: SearchScope = 'all'
): SearchMatchResult => {
  if (!query || !query.trim()) {
    return { isMatch: true, score: 0 };
  }

  const rawQuery = query.trim();
  const normQuery = normalizeArabicText(rawQuery);
  const cleanMeterQuery = normalizeMeterNumber(rawQuery);
  const cleanPhoneQuery = normalizePhoneNumber(rawQuery);

  const subName = subscriber.name || '';
  const normName = normalizeArabicText(subName);

  const rawMeter = subscriber.meterNumber || '';
  const normMeter = normalizeArabicText(rawMeter);
  const cleanMeter = normalizeMeterNumber(rawMeter);

  const rawPhone = subscriber.phone || '';
  const cleanPhone = normalizePhoneNumber(rawPhone);

  const subCode = subscriber.subscriberCode || subscriber.accountNumber || '';
  const normCode = normalizeArabicText(subCode);
  const cleanCode = normalizeMeterNumber(subCode);

  const normZone = normalizeArabicText(subscriber.zone || '');
  const normTransformer = normalizeArabicText(subscriber.transformer || '');
  const normNotes = normalizeArabicText(subscriber.notes || '');
  const normAddress = normalizeArabicText(subscriber.address || '');
  const cleanNationalId = normalizeMeterNumber(subscriber.nationalId || '');

  // 1. Meter-only scope
  if (scope === 'meter') {
    if (cleanMeter && cleanMeterQuery && cleanMeter === cleanMeterQuery) return { isMatch: true, score: 100, matchedField: 'meter' };
    if (cleanMeter && cleanMeterQuery && cleanMeter.startsWith(cleanMeterQuery)) return { isMatch: true, score: 80, matchedField: 'meter' };
    if (cleanMeter && cleanMeterQuery && cleanMeter.includes(cleanMeterQuery)) return { isMatch: true, score: 60, matchedField: 'meter' };
    if (normMeter.includes(normQuery)) return { isMatch: true, score: 50, matchedField: 'meter' };
    return { isMatch: false, score: 0 };
  }

  // 2. Name-only scope
  if (scope === 'name') {
    if (normName === normQuery) return { isMatch: true, score: 100, matchedField: 'name' };
    if (normName.startsWith(normQuery)) return { isMatch: true, score: 85, matchedField: 'name' };
    if (normName.includes(normQuery)) return { isMatch: true, score: 70, matchedField: 'name' };
    const tokens = normQuery.split(/\s+/).filter(Boolean);
    if (tokens.length > 1 && tokens.every(t => normName.includes(t))) {
      return { isMatch: true, score: 60, matchedField: 'name', matchedTokens: tokens };
    }
    return { isMatch: false, score: 0 };
  }

  // 3. Phone-only scope
  if (scope === 'phone') {
    if (cleanPhone && cleanPhoneQuery && (cleanPhone === cleanPhoneQuery || cleanPhone.includes(cleanPhoneQuery))) {
      return { isMatch: true, score: 90, matchedField: 'phone' };
    }
    if (rawPhone.includes(rawQuery)) return { isMatch: true, score: 70, matchedField: 'phone' };
    return { isMatch: false, score: 0 };
  }

  // 4. Zone/Transformer scope
  if (scope === 'zone') {
    if (normZone.includes(normQuery) || normTransformer.includes(normQuery) || normAddress.includes(normQuery)) {
      return { isMatch: true, score: 80, matchedField: 'zone' };
    }
    return { isMatch: false, score: 0 };
  }

  // 5. Code scope
  if (scope === 'code') {
    if (cleanCode && cleanMeterQuery && cleanCode.includes(cleanMeterQuery)) return { isMatch: true, score: 90, matchedField: 'code' };
    if (cleanNationalId && cleanMeterQuery && cleanNationalId.includes(cleanMeterQuery)) return { isMatch: true, score: 85, matchedField: 'code' };
    return { isMatch: false, score: 0 };
  }

  // === GLOBAL / ALL SCOPE (Default) ===

  // 1. Exact Meter Number Match (Highest Score)
  if (cleanMeter && cleanMeterQuery && cleanMeter === cleanMeterQuery) {
    return { isMatch: true, score: 120, matchedField: 'meter' };
  }
  if (rawMeter && rawMeter.trim().toLowerCase() === rawQuery.toLowerCase()) {
    return { isMatch: true, score: 110, matchedField: 'meter' };
  }

  // 2. Exact Code or National ID Match
  if (cleanCode && cleanMeterQuery && cleanCode === cleanMeterQuery) {
    return { isMatch: true, score: 105, matchedField: 'code' };
  }
  if (cleanNationalId && cleanMeterQuery && cleanNationalId === cleanMeterQuery) {
    return { isMatch: true, score: 100, matchedField: 'code' };
  }

  // 3. Exact Name Match
  if (normName === normQuery) {
    return { isMatch: true, score: 95, matchedField: 'name' };
  }

  // 4. Meter number starts with query (e.g. searching "10" matches "1023")
  if (cleanMeterQuery && cleanMeter && cleanMeter.startsWith(cleanMeterQuery)) {
    return { isMatch: true, score: 90, matchedField: 'meter' };
  }

  // 5. Name starts with query
  if (normName.startsWith(normQuery)) {
    return { isMatch: true, score: 85, matchedField: 'name' };
  }

  // 6. Name contains full normalized query phrase
  if (normName.includes(normQuery)) {
    return { isMatch: true, score: 75, matchedField: 'name' };
  }

  // 7. Meter number contains query (e.g. searching "55" matches "MTR-0055-B")
  if (cleanMeterQuery && (cleanMeter.includes(cleanMeterQuery) || normMeter.includes(normQuery))) {
    return { isMatch: true, score: 70, matchedField: 'meter' };
  }

  // 8. Phone match
  if (cleanPhoneQuery && cleanPhone && (cleanPhone.includes(cleanPhoneQuery) || rawPhone.includes(rawQuery))) {
    return { isMatch: true, score: 65, matchedField: 'phone' };
  }

  // 9. Code partial match
  if (cleanMeterQuery && cleanCode && cleanCode.includes(cleanMeterQuery)) {
    return { isMatch: true, score: 60, matchedField: 'code' };
  }

  // 10. Multi-token / Multi-word search (e.g. "محمد علي" matches "محمد بن احمد علي")
  const tokens = normQuery.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const combinedPool = `${normName} ${normMeter} ${cleanPhone} ${normCode} ${normZone} ${normTransformer} ${normAddress} ${normNotes}`;
    const allTokensMatched = tokens.every(token => combinedPool.includes(token));
    if (allTokensMatched) {
      const nameTokensCount = tokens.filter(token => normName.includes(token)).length;
      return { 
        isMatch: true, 
        score: 50 + nameTokensCount * 5, 
        matchedField: nameTokensCount > 0 ? 'name' : 'zone',
        matchedTokens: tokens
      };
    }
  }

  // 11. Zone or Transformer matches
  if (normZone.includes(normQuery) || normTransformer.includes(normQuery) || normAddress.includes(normQuery)) {
    return { isMatch: true, score: 35, matchedField: 'zone' };
  }

  // 12. Notes match
  if (normNotes.includes(normQuery)) {
    return { isMatch: true, score: 25, matchedField: 'notes' };
  }

  return { isMatch: false, score: 0 };
};

/**
 * Highlight matched query substring or multi-tokens inside a text string
 */
export const HighlightMatch: React.FC<{ 
  text: string; 
  query: string; 
  className?: string;
  isMono?: boolean;
}> = ({ 
  text, 
  query, 
  className = 'bg-amber-300 text-amber-950 font-black px-1 py-0.5 rounded shadow-xs' 
}) => {
  if (!query || !query.trim() || !text) return <span>{text}</span>;
  
  const rawQ = query.trim();
  const tokens = rawQ.split(/\s+/).filter(t => t.length > 0);

  if (tokens.length === 0) return <span>{text}</span>;

  // If simple query (single phrase)
  const normQ = normalizeArabicText(rawQ);
  const normT = normalizeArabicText(text);

  const idx = normT.indexOf(normQ);
  if (idx !== -1 && idx < text.length) {
    const matchLen = Math.min(rawQ.length, text.length - idx);
    const before = text.substring(0, idx);
    const matched = text.substring(idx, idx + matchLen);
    const after = text.substring(idx + matchLen);

    return (
      <span>
        {before}
        <mark className={className}>{matched}</mark>
        {after}
      </span>
    );
  }

  // Check if query is numeric / meter digits
  const cleanQ = normalizeMeterNumber(rawQ);
  if (cleanQ && cleanQ.length >= 2) {
    const cleanT = normalizeMeterNumber(text);
    const numIdx = cleanT.indexOf(cleanQ);
    if (numIdx !== -1) {
      return <span className={className}>{text}</span>;
    }
  }

  // Multi-token fallback highlighting
  if (tokens.length > 1) {
    try {
      const pattern = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const regex = new RegExp(`(${pattern})`, 'gi');
      const parts = text.split(regex);
      return (
        <span>
          {parts.map((part, i) => 
            regex.test(part) ? (
              <mark key={i} className={className}>{part}</mark>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </span>
      );
    } catch {
      return <span>{text}</span>;
    }
  }

  return <span>{text}</span>;
};

