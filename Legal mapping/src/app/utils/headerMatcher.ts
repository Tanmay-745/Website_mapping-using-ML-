export interface HeaderMapping {
  sourceHeader: string;
  targetHeader: string | null;
  confidence: number;
}

// Common target headers
export const TARGET_HEADERS = [
  "name",
  "dpd",
  "total outstanding amt",
  "email",
  "phone num",
  "address",
  "lan",
  "office Address",
  "pincode",
  "language",
  "state",
  "loan amount",
  "regional manager",
  "regional manager phone number",
  "phone number",
  "mobile number",
  "agreement date",
  "city",
  "notice",
  "outstanding amount",
  "store",
  "collection manager",
  "collection manager phone number",
  "co-borrower",
  // System-generated columns required for the mapping UI
  "barcode",
  "language1",
  "language2",
  "total outstanding amt",
];

// Explicit mappings for common typos or colloquial terms
const KNOWN_MAPPINGS: Record<string, string> = {
  'lone account number': 'LAN',
  'lone acct no': 'LAN',
  'loan acct no': 'LAN',
  'lan': 'LAN',
  'acc no': 'Account Number',
  'acct no': 'Account Number',
  'mob': 'Mobile Number',
  'ph': 'phone number',
  'addr': 'address',
};

// Normalize header string for comparison
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ') // Replace specials with space
    .replace(/\s+/g, ' ')       // Collapse spaces
    .trim()
    .replace('lone', 'loan');   // Fix specific typo: lone -> loan
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

// Calculate similarity score (0-1) between two strings
function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeHeader(str1);
  const norm2 = normalizeHeader(str2);

  // Exact match on normalized string
  if (norm1 === norm2) {
    return 1.0;
  }

  // Check known mappings
  if (KNOWN_MAPPINGS[norm1] === str2 || KNOWN_MAPPINGS[norm1] === norm2) {
    return 1.0;
  }

  // Check if one string contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return 0.85;
  }

  // Calculate Levenshtein similarity
  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  const similarity = 1 - distance / maxLength;

  // Check for common word matches
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  const commonWords = words1.filter(word => words2.includes(word)).length;

  if (commonWords > 0) {
    const wordBonus = commonWords / Math.max(words1.length, words2.length) * 0.3;
    return Math.min(similarity + wordBonus, 1.0);
  }

  return similarity;
}

// Regex Patterns for Content Analysis
const PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE: /^(\+?91|0)?[6-9]\d{9}$/, // Indian mobile format preference
  PHONE_GENERIC: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
  DATE: /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}|\d{1,2}[-/][a-zA-Z]{3}[-/]\d{2,4}$/,
  PINCODE: /^\d{6}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  AADHAAR: /^\d{4}\s\d{4}\s\d{4}$|^\d{12}$/,
  CURRENCY: /^\$?\d+(,\d{3})*(\.\d{1,2})?$|^₹?\d+(,\d{3})*(\.\d{1,2})?$/,
  NUMBER: /^\d+$/,
  LAN: /^[A-Za-z0-9]{10,20}$/, // Legacy/Loan Account Number: 10-20 alphanumeric, no specials
};

type ContentType = 'email' | 'phone' | 'date' | 'pincode' | 'pan' | 'aadhaar' | 'currency' | 'number' | 'text' | 'lan';

function analyzeContent(samples: string[]): ContentType {
  if (!samples || samples.length === 0) return 'text';

  const votes: Record<ContentType, number> = {
    email: 0, phone: 0, date: 0, pincode: 0, pan: 0, aadhaar: 0, currency: 0, number: 0, text: 0, lan: 0
  };

  samples.forEach(val => {
    const s = String(val).trim();
    if (!s) return;

    if (PATTERNS.EMAIL.test(s)) votes.email++;
    // Check for LAN specifically before general numbers, but handle overlap with Phone
    // Logic: If it matches LAN pattern
    else if (PATTERNS.LAN.test(s)) {
      // If it also matches strict Phone, vote Phone
      if (PATTERNS.PHONE.test(s)) {
        votes.phone++;
      } else {
        // If it has letters, it's definitely LAN (or text, but LAN is more specific)
        // If it's pure number but 10-20 chars and NOT a phone format, vote LAN
        votes.lan++;
      }
    }
    else if (PATTERNS.PHONE.test(s) || PATTERNS.PHONE_GENERIC.test(s) || (s.length >= 10 && s.length <= 13 && /^\d+$/.test(s))) votes.phone++;
    else if (PATTERNS.PAN.test(s)) votes.pan++;
    else if (PATTERNS.AADHAAR.test(s)) votes.aadhaar++;
    else if (PATTERNS.PINCODE.test(s)) votes.pincode++;
    else if (PATTERNS.DATE.test(s) && !/^\d+$/.test(s)) votes.date++;
    else if (PATTERNS.CURRENCY.test(s)) votes.currency++;
    else if (PATTERNS.NUMBER.test(s)) votes.number++;
    else votes.text++;
  });

  // Find winner
  let bestType: ContentType = 'text';
  let maxVotes = 0;
  (Object.keys(votes) as ContentType[]).forEach(type => {
    if (votes[type] > maxVotes) {
      maxVotes = votes[type];
      bestType = type;
    }
  });

  // Threshold: at least 50% of samples must match to declare a type (except text)
  if (maxVotes < samples.length * 0.5) return 'text';

  return bestType;
}

// Map content types to target header keywords
const TYPE_KEYWORDS: Record<ContentType, string[]> = {
  email: ['email', 'e-mail'],
  phone: ['phone', 'mobile', 'contact', 'cell'],
  date: ['date', 'dob', 'anniversary'],
  pincode: ['pincode', 'pin', 'zip', 'postal'],
  pan: ['pan'],
  aadhaar: ['aadhaar', 'uid'],
  currency: ['amount', 'outstanding', 'balance', 'cost', 'price', 'rate'],
  number: ['sno', 'quantity', 'count'],
  lan: ['lan', 'account number', 'loan account'],
  text: []
};

// Find best match for a source header from target headers
export function findBestMatch(
  sourceHeader: string,
  targetHeaders: string[],
  samples: string[] = []
): { header: string | null; confidence: number } {
  let bestMatch: string | null = null;
  let highestScore = 0;

  const normalizedSource = normalizeHeader(sourceHeader);

  // 1. Check Explicit Mappings First
  if (KNOWN_MAPPINGS[normalizedSource]) {
    const mappedTarget = KNOWN_MAPPINGS[normalizedSource];
    // Check if this explicit target exists in available targets
    const targetMatch = targetHeaders.find(t => t.toLowerCase() === mappedTarget.toLowerCase() || t === mappedTarget);
    if (targetMatch) {
      return { header: targetMatch, confidence: 1.0 };
    }
    // If explicit mapping target isn't available (e.g. Account Number isn't in list?), check synonyms
    if (mappedTarget === 'Account Number') {
      const lanMatch = targetHeaders.find(t => t === 'LAN');
      if (lanMatch) return { header: lanMatch, confidence: 1.0 };
    }
  }

  const contentType = analyzeContent(samples);

  // Special Auto-Mapping logic provided by user:
  // "If you identify it in any column name it to LAN"
  if (contentType === 'lan') {
    const lanTarget = targetHeaders.find(t => t === 'LAN');
    if (lanTarget) {
      return { header: lanTarget, confidence: 0.99 };
    }
  }

  for (const targetHeader of targetHeaders) {
    let score = calculateSimilarity(sourceHeader, targetHeader);
    const targetLower = targetHeader.toLowerCase();
    const sourceLower = sourceHeader.toLowerCase();

    // Boost based on Content Type
    if (contentType !== 'text') {
      const keywords = TYPE_KEYWORDS[contentType] || [];
      if (keywords.some(k => targetLower.includes(k))) {
        if (score < 0.8) score = Math.max(score, 0.85); // Boost low scores
        else score = Math.min(score + 0.15, 1.0); // Boost existing high scores
      }
    }

    // Tie-breaker/Preference:
    // If the source DOES NOT contain 'id', but the target DOES contain 'id', penalize slightly
    // If the source DOES NOT contain 'name', but the target DOES contain 'name', boost slightly
    // This solves cases where "Anchor" maps to "Anchor ID" instead of "Anchor Name"
    if (!sourceLower.includes('id') && targetLower.includes('id')) {
      score -= 0.05;
    }
    if (!sourceLower.includes('name') && targetLower.includes('name')) {
      score += 0.05;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = targetHeader;
    }
  }

  // Only consider it a match if confidence is above threshold
  if (highestScore < 0.4) {
    return { header: null, confidence: 0 };
  }

  return { header: bestMatch, confidence: highestScore };
}

// Map all source headers to target headers
export function mapHeaders(
  sourceHeaders: string[],
  targetHeaders: string[] = TARGET_HEADERS,
  dataSamples: Record<string, string[]> = {}
): HeaderMapping[] {
  return sourceHeaders.map((sourceHeader) => {
    const samples = dataSamples[sourceHeader] || [];
    const { header, confidence } = findBestMatch(sourceHeader, targetHeaders, samples);

    return {
      sourceHeader,
      targetHeader: header,
      confidence,
    };
  });
}