// Verification script for Field Extractor & Fuzzy Salt Matcher
import {
  extractAllFields
} from './src/ocr/fieldExtractor.ts';

const testPacks = [
  {
    name: "Vitamin C Foil Blister Strip (Foil Glare Typo & QR Data)",
    ocr: `VITAMIN C TABLETS IP 500 mg\nEach uncoated chewable tablet contains:\nAscorbc Acid IP 500mg\nColour: Sunset Yellow FCF\nManufactured by: Abbott India Limited`,
    qrData: "(01)08901148205121(17)281031(10)BT9941",
    expectedSalt: "Ascorbic Acid",
    expectedStrength: "500 mg",
    expectedForm: "Tablet",
    expectedStatus: "ok",
    expectedBatch: "BT9941"
  },
  {
    name: "Dolo 650 Strip",
    ocr: `DOLO 650\nParacetamol Tablets IP 650 mg\nEach uncoated tablet contains:\nParacetamol IP 650mg\nB.No: DL9042\nMFG: 04/2025\nEXP: 03/2028\nMfd. by: Micro Labs Limited`,
    expectedSalt: "Paracetamol",
    expectedStrength: "650 mg",
    expectedForm: "Tablet",
    expectedStatus: "ok"
  },
  {
    name: "Augmentin 625 Duo",
    ocr: `Augmentin 625 Duo\nAmoxicillin and Potassium Clavulanate Tablets IP\nAmoxicillin 500mg\nBatch: AG8821\nMFG DATE: 01/2023\nEXP. DATE: 10/2023\nManufactured by: GlaxoSmithKline`,
    expectedSalt: "Amoxicillin",
    expectedForm: "Tablet",
    expectedStatus: "expired"
  },
  {
    name: "Ascoril LS Syrup",
    ocr: `Ascoril LS\nOral Suspension\nEach 5 ml contains:\nAmbroxol HCl 30 mg / 5 ml\nEXP: 12/2026\nGlenmark Pharmaceuticals`,
    expectedSalt: "Ambroxol",
    expectedForm: "Suspension",
    expectedStrength: "30 mg / 5 ml",
    expectedStatus: "expiring_soon"
  },
  {
    name: "Ciplox Eye Drops",
    ocr: `Ciplox\nCiprofloxacin Ophthalmic Solution 0.3% w/v\nEye/Ear Drops\nEXP. 08/2027\nMfd. by: Cipla Ltd`,
    expectedSalt: "Ciprofloxacin",
    expectedForm: "Eye/Ear Drops",
    expectedStrength: "0.3% w/v",
    expectedStatus: "ok"
  }
];

let passed = 0;
for (const pack of testPacks) {
  const result = extractAllFields(pack.ocr, 92, pack.qrData);
  console.log(`\nTesting: ${pack.name}`);
  console.log(`- Detected Salt: ${result.generic_name} (Expected: ${pack.expectedSalt})`);
  console.log(`- Form: ${result.form} (Expected: ${pack.expectedForm})`);
  console.log(`- Strength: ${result.strength} (Expected: ${pack.expectedStrength})`);
  console.log(`- Expiry Status: ${result.expiry_status} (Expected: ${pack.expectedStatus})`);
  console.log(`- Batch: ${result.batch}`);
  console.log(`- Brand: ${result.brand}`);

  let ok = true;
  if (pack.expectedSalt && result.generic_name.toLowerCase() !== pack.expectedSalt.toLowerCase()) ok = false;
  if (pack.expectedForm && result.form !== pack.expectedForm) ok = false;
  if (pack.expectedStrength && result.strength.replace(/\s+/g, '') !== pack.expectedStrength.replace(/\s+/g, '')) ok = false;
  if (pack.expectedStatus && result.expiry_status !== pack.expectedStatus) ok = false;
  if (pack.expectedBatch && result.batch !== pack.expectedBatch) ok = false;

  if (ok) {
    console.log(`PASS: ${pack.name}`);
    passed++;
  } else {
    console.error(`FAIL: ${pack.name}`);
  }
}

console.log(`\nTotal Passed: ${passed}/${testPacks.length}`);
if (passed === testPacks.length) {
  process.exit(0);
} else {
  process.exit(1);
}
