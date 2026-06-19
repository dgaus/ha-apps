const STORAGE_KEY = 'swim_occupancy_records';


function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * @typedef {Object} Record
 * @property {number} timestamp - Unix timestamp in milliseconds
 * @property {number} rating - Occupancy rating (1-5)
 * @property {string} startSlot - ISO string or simply "Day-Time" identifier for easier grouping (optional, can be derived)
 */

export const Storage = {
  /**
   * getRecords
   * @returns {Promise<Record[]>}
   */
  getRecords: async () => {
    try {
      const res = await fetch('api/records');
      if (!res.ok) throw new Error('Failed to fetch');
      return await res.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  /**
   * getConfig - fetch the schedule/slot-duration config from the server
   * @returns {Promise<Object|null>} canonical config, or null on error (caller falls back to defaults)
   */
  getConfig: async () => {
    try {
      const res = await fetch('api/config');
      if (!res.ok) throw new Error('Failed to fetch config');
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  /**
   * addRecord
   * @param {number} rating 
   * @param {number} day - Day of week (0-6)
   * @param {string} time - Time slot (HH:MM format)
   */
  addRecord: async (rating, day, time) => {
    try {
      console.log('[Storage] addRecord called', rating, day, time);
      const id = Date.now().toString(36) + Math.random().toString(36).substr(2);

      // Timestamp represents when the measurement was input (now)
      const now = new Date();

      const payload = {
        id,
        rating,
        timestamp: now.getTime(),
        day,
        time
      };

      const res = await fetch('api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save');
    } catch (err) {
      console.error(err);
    }
  },

  /**
   * importRecords - bulk-load records (merged by id on the server)
   * @param {Array} records
   * @returns {Promise<{imported:number, skipped:number, total:number}>}
   */
  importRecords: async (records) => {
    const res = await fetch('api/records/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(records)
    });
    if (!res.ok) throw new Error('Import failed');
    return await res.json();
  },

  /**
   * removeRecord
   * @param {string} id
   */
  removeRecord: async (id) => {
    try {
      await fetch(`api/records/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
    }
  },

  /**
   * clearRecords - Not really used in UI but good to keep signature if needed
   */
  clearRecords: async () => {
    // No endpoint for clear all yet, implement loop or add endpoint if needed.
    // For now, let's leave empty or warn.
    console.warn('clearRecords not implemented for API storage');
  }
};
