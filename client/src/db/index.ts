import Dexie, { type Table } from 'dexie';
import type { HistoryRecord, ClinicalSections } from '../types';

export class MediCareDatabase extends Dexie {
  scans!: Table<HistoryRecord, number>;

  constructor() {
    super('MediCareDB');
    this.version(1).stores({
      scans: '++id, created_at, expiry_status'
    });
  }
}

export const db = new MediCareDatabase();

export async function saveScanRecord(record: Omit<HistoryRecord, 'id'>): Promise<number> {
  return await db.scans.add(record as HistoryRecord);
}

export async function getAllScanRecords(): Promise<HistoryRecord[]> {
  return await db.scans.orderBy('created_at').reverse().toArray();
}

export async function getScanRecordById(id: number): Promise<HistoryRecord | undefined> {
  return await db.scans.get(id);
}

export async function updateScanTelugu(id: number, teluguResult: ClinicalSections): Promise<void> {
  await db.scans.update(id, { result_te: teluguResult });
}

export async function deleteScanRecord(id: number): Promise<void> {
  await db.scans.delete(id);
}

export async function clearAllScanRecords(): Promise<void> {
  await db.scans.clear();
}
