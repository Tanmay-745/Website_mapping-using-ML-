export interface AddressSummary {
  deliverable: number;
  needsReview: number;
  junk: number;
  total: number;
}

const JUNK_KEYWORDS = new Set(['na', 'none', 'null', 'unknown', 'test', '-', '.', 'xx', 'xxx', 'nil', 'n/a']);
const STRUCTURAL_KEYWORDS = new Set([
  'flat', 'house', 'no', 'number', 'street', 'st', 'road', 'rd', 'marg',
  'nagar', 'colony', 'village', 'vill', 'dist', 'district', 'taluka', 'tal',
  'tehsil', 'floor', 'apt', 'apartment', 'bldg', 'building', 'society',
  'soc', 'phase', 'sector', 'block', 'near', 'beside', 'opp', 'opposite'
]);

export function analyzeAddressStatus(address: string | undefined | null): 'Deliverable' | 'Needs Review' | 'Junk' {
  if (!address || typeof address !== 'string') return 'Junk';
  const text = address.trim().toLowerCase();
  if (!text) return 'Junk';

  const words = text.split(/[\s,.-]+/).filter(Boolean);
  const pincodeMatch = /\b[1-9][0-9]{5}\b/.test(text);
  
  const totalChars = text.length;
  let alphaChars = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if ((c >= 97 && c <= 122) || (c >= 65 && c <= 90)) alphaChars++;
  }
  
  const alphaRatio = totalChars > 0 ? alphaChars / totalChars : 0;
  const structuralMatches = words.filter(w => STRUCTURAL_KEYWORDS.has(w)).length;
  const isJunkWord = words.length === 1 && JUNK_KEYWORDS.has(words[0]);

  if (isJunkWord || (words.length < 3 && !pincodeMatch) || alphaRatio < 0.2) {
    return 'Junk';
  }

  if (pincodeMatch && words.length >= 4) return 'Deliverable';
  if (!pincodeMatch && words.length >= 6 && structuralMatches >= 2) return 'Deliverable';

  return 'Needs Review';
}

export function batchAnalyzeAddresses(addresses: (string | undefined | null)[]): AddressSummary {
  const summary: AddressSummary = { deliverable: 0, needsReview: 0, junk: 0, total: addresses.length };
  for (const addr of addresses) {
    const status = analyzeAddressStatus(addr);
    if (status === 'Deliverable') summary.deliverable++;
    else if (status === 'Needs Review') summary.needsReview++;
    else summary.junk++;
  }
  return summary;
}
