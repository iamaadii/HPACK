import { STATIC_TABLE, lookupStaticTable } from './staticTable.js';
import { encodeInteger, decodeInteger } from './integerCodec.js';
import { encodeStringLiteral, decodeStringLiteral } from './huffmanCodec.js';
import { DynamicTable } from './dynamicTable.js';

export class HpackContext {
  /**
   * @param {object} options
   * @param {number} [options.maxTableSize=4096]
   * @param {number} [options.maxEntries=null]
   * @param {boolean} [options.useHuffman=false]
   */
  constructor(options = {}) {
    this.maxTableSize = options.maxTableSize || 4096;
    this.maxEntries = options.maxEntries || null;
    this.useHuffman = options.useHuffman || false;
    this.dynamicTable = new DynamicTable(this.maxTableSize, this.maxEntries);
  }

  /**
   * Lookup an entry by index in combined static + dynamic tables
   * @param {number} index 1-based index
   * @returns {{ name: string, value: string } | null}
   */
  getHeaderByIndex(index) {
    if (index >= 1 && index <= 61) {
      return STATIC_TABLE[index];
    }
    if (index >= 62) {
      return this.dynamicTable.get(index);
    }
    return null;
  }

  /**
   * Search for exact match or name match across both static and dynamic tables
   * Static table is checked first, then dynamic table.
   * @param {string} name
   * @param {string} value
   * @returns {{ index: number, exact: boolean, isStatic: boolean } | null}
   */
  findMatch(name, value) {
    // 1. Check static table
    const staticMatch = lookupStaticTable(name, value);
    if (staticMatch && staticMatch.exact) {
      return { index: staticMatch.index, exact: true, isStatic: true };
    }

    // 2. Check dynamic table
    const dynMatch = this.dynamicTable.lookup(name, value);
    if (dynMatch && dynMatch.exact) {
      return { index: dynMatch.index, exact: true, isStatic: false };
    }

    // 3. Fallback to name-only match (prefer static if available)
    if (staticMatch) {
      return { index: staticMatch.index, exact: false, isStatic: true };
    }
    if (dynMatch) {
      return { index: dynMatch.index, exact: false, isStatic: false };
    }

    return null;
  }

  /**
   * Encode a single header
   * @param {string} name
   * @param {string} value
   * @param {object} options
   * @param {number} [options.preferredCase] 2 or 3 for non-exact matches (default: 2)
   * @param {boolean} [options.useHuffman] override context huffman setting
   */
  encodeHeader(name, value, options = {}) {
    const useHuffman = options.useHuffman !== undefined ? options.useHuffman : this.useHuffman;
    const preferredCase = options.preferredCase || 2; // 2 = incremental indexing, 3 = without indexing

    const match = this.findMatch(name, value);
    const byteChunks = [];
    let caseNumber = 2;
    let explanation = '';
    let tableAction = 'None';
    let evicted = [];

    // Case 1: Indexed Header Field (Exact match on both name and value)
    if (match && match.exact) {
      caseNumber = 1;
      const index = match.index;
      explanation = `Case 1: Indexed Header Field. Exact match found at index ${index} (${match.isStatic ? 'Static Table' : 'Dynamic Table'}).`;

      // 7-bit prefix integer with MSB = 1 (mask 0x80)
      const encodedBytes = encodeInteger(index, 7, 0x80);
      byteChunks.push({
        type: 'index',
        label: `Index ${index} (${name}: ${value})`,
        bytes: encodedBytes,
        binary: encodedBytes.map(b => b.toString(2).padStart(8, '0')).join(' ')
      });

      return {
        header: { name, value },
        caseNumber,
        explanation,
        bytes: encodedBytes,
        byteChunks,
        tableAction: 'No change (Case 1 does not modify dynamic table)',
        evicted: [],
        dynamicTableSnapshot: this.dynamicTable.getEntries()
      };
    }

    // If not exact match, decide between Case 2 and Case 3
    caseNumber = preferredCase === 3 ? 3 : 2;

    const nameIndex = match ? match.index : 0;
    const prefixBits = caseNumber === 2 ? 6 : 4;
    const prefixMask = caseNumber === 2 ? 0x40 : 0x00;

    let totalBytes = [];

    if (nameIndex > 0) {
      // Indexed name + Literal value
      explanation = `Case ${caseNumber}: Literal Header Field ${caseNumber === 2 ? 'with Incremental Indexing' : 'without Indexing'}. Name matched at index ${nameIndex} (${match.isStatic ? 'Static Table' : 'Dynamic Table'}).`;

      const indexBytes = encodeInteger(nameIndex, prefixBits, prefixMask);
      totalBytes.push(...indexBytes);
      byteChunks.push({
        type: 'name-index',
        label: `Name Index ${nameIndex} (${name})`,
        bytes: indexBytes,
        binary: indexBytes.map(b => b.toString(2).padStart(8, '0')).join(' ')
      });

      const valueBytes = encodeStringLiteral(value, useHuffman);
      totalBytes.push(...valueBytes);
      byteChunks.push({
        type: 'value-literal',
        label: `Value Literal: "${value}" (${useHuffman ? 'Huffman encoded' : 'Plain text'})`,
        bytes: valueBytes,
        binary: valueBytes.map(b => b.toString(2).padStart(8, '0')).join(' ')
      });
    } else {
      // Literal name + Literal value
      explanation = `Case ${caseNumber}: Literal Header Field ${caseNumber === 2 ? 'with Incremental Indexing' : 'without Indexing'}. New name "${name}" (Index 0).`;

      const indexZeroBytes = encodeInteger(0, prefixBits, prefixMask);
      totalBytes.push(...indexZeroBytes);
      byteChunks.push({
        type: 'name-index-zero',
        label: `Index 0 (New Name)`,
        bytes: indexZeroBytes,
        binary: indexZeroBytes.map(b => b.toString(2).padStart(8, '0')).join(' ')
      });

      const nameBytes = encodeStringLiteral(name, useHuffman);
      totalBytes.push(...nameBytes);
      byteChunks.push({
        type: 'name-literal',
        label: `Name Literal: "${name}" (${useHuffman ? 'Huffman encoded' : 'Plain text'})`,
        bytes: nameBytes,
        binary: nameBytes.map(b => b.toString(2).padStart(8, '0')).join(' ')
      });

      const valueBytes = encodeStringLiteral(value, useHuffman);
      totalBytes.push(...valueBytes);
      byteChunks.push({
        type: 'value-literal',
        label: `Value Literal: "${value}" (${useHuffman ? 'Huffman encoded' : 'Plain text'})`,
        bytes: valueBytes,
        binary: valueBytes.map(b => b.toString(2).padStart(8, '0')).join(' ')
      });
    }

    if (caseNumber === 2) {
      const addResult = this.dynamicTable.add(name, value);
      evicted = addResult.evicted || [];
      tableAction = `Saved to Dynamic Table at index 62 (+${DynamicTable.entrySize(name, value)} bytes).`;
      if (evicted.length > 0) {
        tableAction += ` Evicted ${evicted.length} oldest entry(ies).`;
      }
    } else {
      tableAction = 'Not added to Dynamic Table (Case 3 does not index).';
    }

    return {
      header: { name, value },
      caseNumber,
      explanation,
      bytes: totalBytes,
      byteChunks,
      tableAction,
      evicted,
      dynamicTableSnapshot: this.dynamicTable.getEntries()
    };
  }

  /**
   * Encode a full list of headers
   * @param {Array<{name: string, value: string}>} headers
   * @param {object} options
   */
  encode(headers, options = {}) {
    const results = [];
    const allBytes = [];

    for (const h of headers) {
      const step = this.encodeHeader(h.name, h.value, options);
      results.push(step);
      allBytes.push(...step.bytes);
    }

    return {
      steps: results,
      bytes: allBytes,
      hex: Buffer.from(allBytes).toString('hex'),
      totalBytes: allBytes.length
    };
  }

  /**
   * Decode an HPACK byte buffer into headers
   * @param {Uint8Array|number[]} buffer
   * @returns {{ headers: Array<{name: string, value: string, caseNumber: number, detail: string}>, dynamicTableSnapshot: any[] }}
   */
  decode(buffer) {
    const headers = [];
    let offset = 0;

    while (offset < buffer.length) {
      const firstByte = buffer[offset];

      // Case 1: Indexed Header Field (Pattern: 1xxxxxxx)
      if ((firstByte & 0x80) === 0x80) {
        const { value: index, bytesRead } = decodeInteger(buffer, offset, 7);
        offset += bytesRead;

        const entry = this.getHeaderByIndex(index);
        if (!entry) {
          throw new Error(`Decoder error: invalid table index ${index}`);
        }

        headers.push({
          name: entry.name,
          value: entry.value,
          caseNumber: 1,
          detail: `Case 1: Indexed Header Field (Index ${index})`
        });
      }
      // Case 2: Literal Header Field with Incremental Indexing (Pattern: 01xxxxxx)
      else if ((firstByte & 0xc0) === 0x40) {
        const { value: nameIndex, bytesRead } = decodeInteger(buffer, offset, 6);
        offset += bytesRead;

        let name = '';
        if (nameIndex > 0) {
          const entry = this.getHeaderByIndex(nameIndex);
          if (!entry) {
            throw new Error(`Decoder error: invalid name index ${nameIndex}`);
          }
          name = entry.name;
        } else {
          const nameLit = decodeStringLiteral(buffer, offset);
          name = nameLit.value;
          offset += nameLit.bytesRead;
        }

        const valueLit = decodeStringLiteral(buffer, offset);
        const value = valueLit.value;
        offset += valueLit.bytesRead;

        this.dynamicTable.add(name, value);

        headers.push({
          name,
          value,
          caseNumber: 2,
          detail: `Case 2: Literal with Incremental Indexing (Name index: ${nameIndex})`
        });
      }
      // Case 3: Literal Header Field without Indexing (Pattern: 0000xxxx)
      else if ((firstByte & 0xf0) === 0x00) {
        const { value: nameIndex, bytesRead } = decodeInteger(buffer, offset, 4);
        offset += bytesRead;

        let name = '';
        if (nameIndex > 0) {
          const entry = this.getHeaderByIndex(nameIndex);
          if (!entry) {
            throw new Error(`Decoder error: invalid name index ${nameIndex}`);
          }
          name = entry.name;
        } else {
          const nameLit = decodeStringLiteral(buffer, offset);
          name = nameLit.value;
          offset += nameLit.bytesRead;
        }

        const valueLit = decodeStringLiteral(buffer, offset);
        const value = valueLit.value;
        offset += valueLit.bytesRead;

        // Case 3: do not add to dynamic table
        headers.push({
          name,
          value,
          caseNumber: 3,
          detail: `Case 3: Literal without Indexing (Name index: ${nameIndex})`
        });
      }
      // Context / Dynamic Table Size Update (Pattern: 001xxxxx)
      else if ((firstByte & 0xe0) === 0x20) {
        const { value: newSize, bytesRead } = decodeInteger(buffer, offset, 5);
        offset += bytesRead;
        this.dynamicTable.maxSize = newSize;
        // Evict if necessary
        while (this.dynamicTable.currentSize > newSize && this.dynamicTable.entries.length > 0) {
          const removed = this.dynamicTable.entries.pop();
          this.dynamicTable.currentSize -= removed.size;
        }
      }
      // Case 4: Never Indexed (Pattern: 0001xxxx) - treated as without indexing
      else if ((firstByte & 0xf0) === 0x10) {
        const { value: nameIndex, bytesRead } = decodeInteger(buffer, offset, 4);
        offset += bytesRead;

        let name = '';
        if (nameIndex > 0) {
          const entry = this.getHeaderByIndex(nameIndex);
          if (!entry) {
            throw new Error(`Decoder error: invalid name index ${nameIndex}`);
          }
          name = entry.name;
        } else {
          const nameLit = decodeStringLiteral(buffer, offset);
          name = nameLit.value;
          offset += nameLit.bytesRead;
        }

        const valueLit = decodeStringLiteral(buffer, offset);
        const value = valueLit.value;
        offset += valueLit.bytesRead;

        headers.push({
          name,
          value,
          caseNumber: 3,
          detail: `Literal Never Indexed (Name index: ${nameIndex})`
        });
      } else {
        throw new Error(`Unknown byte header pattern: 0x${firstByte.toString(16)} at offset ${offset}`);
      }
    }

    return {
      headers,
      dynamicTableSnapshot: this.dynamicTable.getEntries()
    };
  }

  /**
   * Reset context
   */
  reset() {
    this.dynamicTable.clear();
  }
}
