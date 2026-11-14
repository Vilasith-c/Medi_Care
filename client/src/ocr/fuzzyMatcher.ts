export interface SaltMatch {
  canonicalName: string;
  matchedFrom: string;
  confidence: number; // 0.0 - 1.0
  isIndianPharmacopoeia: boolean;
}

// Canonical salt database with common packaging aliases & abbreviations
export const KNOWN_SALTS = [
  { canonical: 'Ascorbic Acid', aliases: ['Vitamin C', 'Ascorbate', 'Sodium Ascorbate', 'Ascorbic Acid IP'] },
  { canonical: 'Paracetamol', aliases: ['Acetaminophen', 'PCM', 'Paracetamol IP', 'Paracetamol BP'] },
  { canonical: 'Ibuprofen', aliases: ['Ibuprofen IP', 'Brufen', 'Ibuprofen BP'] },
  { canonical: 'Amoxicillin', aliases: ['Amoxycillin', 'Amoxicillin Trihydrate', 'Amoxicillin IP'] },
  { canonical: 'Clavulanic Acid', aliases: ['Potassium Clavulanate', 'Clavulanate Potassium'] },
  { canonical: 'Azithromycin', aliases: ['Azithromycin Dihydrate', 'Azithromycin IP'] },
  { canonical: 'Cefixime', aliases: ['Cefixime Trihydrate', 'Cefixime IP'] },
  { canonical: 'Metformin', aliases: ['Metformin Hydrochloride', 'Metformin HCl', 'Metformin IP'] },
  { canonical: 'Pantoprazole', aliases: ['Pantoprazole Sodium', 'Pantoprazole IP'] },
  { canonical: 'Omeprazole', aliases: ['Omeprazole Magnesium', 'Omeprazole IP'] },
  { canonical: 'Rabeprazole', aliases: ['Rabeprazole Sodium', 'Rabeprazole IP'] },
  { canonical: 'Cetirizine', aliases: ['Cetirizine Dihydrochloride', 'Cetirizine HCl', 'Cetirizine IP'] },
  { canonical: 'Levocetirizine', aliases: ['Levocetirizine Dihydrochloride', 'Levocetirizine IP'] },
  { canonical: 'Montelukast', aliases: ['Montelukast Sodium', 'Montelukast IP'] },
  { canonical: 'Amlodipine', aliases: ['Amlodipine Besylate', 'Amlodipine IP'] },
  { canonical: 'Telmisartan', aliases: ['Telmisartan IP'] },
  { canonical: 'Atorvastatin', aliases: ['Atorvastatin Calcium', 'Atorvastatin IP'] },
  { canonical: 'Rosuvastatin', aliases: ['Rosuvastatin Calcium', 'Rosuvastatin IP'] },
  { canonical: 'Ciprofloxacin', aliases: ['Ciprofloxacin Hydrochloride', 'Ciprofloxacin IP'] },
  { canonical: 'Ofloxacin', aliases: ['Ofloxacin IP'] },
  { canonical: 'Diclofenac', aliases: ['Diclofenac Sodium', 'Diclofenac Potassium', 'Diclofenac IP'] },
  { canonical: 'Aceclofenac', aliases: ['Aceclofenac IP'] },
  { canonical: 'Ranitidine', aliases: ['Ranitidine Hydrochloride', 'Ranitidine IP'] },
  { canonical: 'Domperidone', aliases: ['Domperidone IP'] },
  { canonical: 'Salbutamol', aliases: ['Albuterol', 'Salbutamol Sulphate', 'Salbutamol IP'] },
  { canonical: 'Ambroxol', aliases: ['Ambroxol Hydrochloride', 'Ambroxol IP'] },
  { canonical: 'Dextromethorphan', aliases: ['Dextromethorphan Hydrobromide', 'Dextromethorphan IP'] },
];

/**
 * Standard Levenshtein distance algorithm
 */
function levenshtein(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, (_, i) => [i]);
  for (let j = 0; j <= an; j++) matrix[0][j] = j;

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

/**
 * Normalized similarity between two strings: 1.0 = identical, 0.0 = completely different
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.trim().toLowerCase();
  const s2 = str2.trim().toLowerCase();
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshtein(s1, s2);
  return 1 - dist / maxLen;
}

/**
 * Fuzzy matches noisy OCR text (foil glare, curved letters) against our clinical salts library.
 * e.g., "Ascorbc Acid IP 500mg" or "Vitamin C Tablts" -> { canonicalName: "Ascorbic Acid", confidence: 0.92 }
 */
export function fuzzyMatchSaltInText(ocrText: string): SaltMatch | null {
  const isIP = /\bIP\b/i.test(ocrText);
  const normalizedOcr = ocrText.toLowerCase();

  let bestMatch: SaltMatch | null = null;
  let highestScore = 0.65; // Threshold for acceptance

  // 1. Direct or fuzzy scan across lines and token sequences
  const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 3);

  for (const entry of KNOWN_SALTS) {
    const candidateNames = [entry.canonical, ...entry.aliases];

    for (const cand of candidateNames) {
      const candLower = cand.toLowerCase();

      // Check if candidate appears directly inside the OCR text
      if (normalizedOcr.includes(candLower)) {
        return {
          canonicalName: entry.canonical,
          matchedFrom: cand,
          confidence: 0.99,
          isIndianPharmacopoeia: isIP
        };
      }

      // Check fuzzy similarity against each line or n-gram window
      for (const line of lines) {
        const lineLower = line.toLowerCase();
        
        // Check whole line similarity
        const score = stringSimilarity(candLower, lineLower);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = {
            canonicalName: entry.canonical,
            matchedFrom: cand,
            confidence: Math.round(score * 100) / 100,
            isIndianPharmacopoeia: isIP
          };
        }

        // Check sliding window across the line
        const words = lineLower.split(/\s+/);
        const candWordCount = candLower.split(/\s+/).length;
        for (let i = 0; i <= words.length - candWordCount; i++) {
          const window = words.slice(i, i + candWordCount).join(' ');
          const winScore = stringSimilarity(candLower, window);
          if (winScore > highestScore) {
            highestScore = winScore;
            bestMatch = {
              canonicalName: entry.canonical,
              matchedFrom: cand,
              confidence: Math.round(winScore * 100) / 100,
              isIndianPharmacopoeia: isIP
            };
          }
        }
      }
    }
  }

  return bestMatch;
}
