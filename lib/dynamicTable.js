/**
 * Dynamic Table implementation for HPACK (RFC 7541 Section 2.3.2 & 4.1)
 *
 * Entries are 1-indexed starting at 62:
 * - Newest entry is at index 62
 * - Older entries shift to higher indices (63, 64, ...)
 * - Size calculation: name.length + value.length + 32 bytes overhead
 * - When full, oldest entry (at highest index) is evicted
 */
export class DynamicTable {
  /**
   * @param {number} maxSizeInBytes Maximum allowed size in bytes (default 4096)
   * @param {number|null} maxEntries Optional max entry count limit
   */
  constructor(maxSizeInBytes = 4096, maxEntries = null) {
    this.entries = []; // Index 0 in this array is newest (index 62 in HPACK)
    this.maxSize = maxSizeInBytes;
    this.maxEntries = maxEntries;
    this.currentSize = 0;
    this.evictionHistory = []; // Tracks recent evictions for visualization
  }

  /**
   * Entry size in bytes per RFC 7541 Section 4.1
   */
  static entrySize(name, value) {
    const nameBytes = Buffer.byteLength(name, 'utf-8');
    const valueBytes = Buffer.byteLength(value, 'utf-8');
    return nameBytes + valueBytes + 32;
  }

  /**
   * Add a new header to the dynamic table
   * @param {string} name
   * @param {string} value
   * @returns {{ evicted: Array<{name: string, value: string, size: number}> }}
   */
  add(name, value) {
    const entrySize = DynamicTable.entrySize(name, value);
    const evicted = [];

    // If a single entry exceeds the maximum size, dynamic table must be emptied
    if (entrySize > this.maxSize) {
      while (this.entries.length > 0) {
        const removed = this.entries.pop();
        this.currentSize -= removed.size;
        evicted.push(removed);
      }
      return { evicted };
    }

    // Evict oldest entries until there is room
    while (
      (this.currentSize + entrySize > this.maxSize) ||
      (this.maxEntries !== null && this.entries.length >= this.maxEntries)
    ) {
      const removed = this.entries.pop();
      if (removed) {
        this.currentSize -= removed.size;
        evicted.push(removed);
        this.evictionHistory.push({
          name: removed.name,
          value: removed.value,
          size: removed.size,
          timestamp: Date.now()
        });
      } else {
        break;
      }
    }

    const newEntry = { name, value, size: entrySize, addedAt: Date.now() };
    this.entries.unshift(newEntry);
    this.currentSize += entrySize;

    return { evicted, entry: newEntry };
  }

  /**
   * Lookup by 1-based dynamic index (starts at 62)
   * @param {number} hpackIndex
   */
  get(hpackIndex) {
    if (hpackIndex < 62) return null;
    const arrayIdx = hpackIndex - 62;
    if (arrayIdx < this.entries.length) {
      return this.entries[arrayIdx];
    }
    return null;
  }

  /**
   * Search for exact match or name match in dynamic table
   * @param {string} name
   * @param {string} value
   * @returns {{ index: number, exact: boolean } | null}
   */
  lookup(name, value) {
    const lowerName = name.toLowerCase();
    let nameMatchIdx = null;

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const hpackIndex = 62 + i;
      if (entry.name.toLowerCase() === lowerName) {
        if (entry.value === value) {
          return { index: hpackIndex, exact: true };
        }
        if (nameMatchIdx === null) {
          nameMatchIdx = hpackIndex;
        }
      }
    }

    if (nameMatchIdx !== null) {
      return { index: nameMatchIdx, exact: false };
    }
    return null;
  }

  /**
   * Return array of all dynamic entries with their current HPACK indices
   */
  getEntries() {
    return this.entries.map((e, idx) => ({
      index: 62 + idx,
      name: e.name,
      value: e.value,
      size: e.size,
      addedAt: e.addedAt
    }));
  }

  /**
   * Clear dynamic table
   */
  clear() {
    this.entries = [];
    this.currentSize = 0;
    this.evictionHistory = [];
  }
}
