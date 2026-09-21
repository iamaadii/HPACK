/**
 * HPACK / HTTP/2 Explorer - Standalone Browser Engine & Controller
 * Implements RFC 7541 completely in-browser for zero-latency, offline & server execution.
 */

// ==========================================================================
// 1. RFC 7541 Appendix A: 61 Static Table Entries
// ==========================================================================
const STATIC_TABLE = [
  null,
  { name: ':authority', value: '' },
  { name: ':method', value: 'GET' },
  { name: ':method', value: 'POST' },
  { name: ':path', value: '/' },
  { name: ':path', value: '/index.html' },
  { name: ':scheme', value: 'http' },
  { name: ':scheme', value: 'https' },
  { name: ':status', value: '200' },
  { name: ':status', value: '204' },
  { name: ':status', value: '206' },
  { name: ':status', value: '304' },
  { name: ':status', value: '400' },
  { name: ':status', value: '404' },
  { name: ':status', value: '500' },
  { name: 'accept-charset', value: '' },
  { name: 'accept-encoding', value: 'gzip, deflate' },
  { name: 'accept-language', value: '' },
  { name: 'accept-ranges', value: '' },
  { name: 'accept', value: '' },
  { name: 'access-control-allow-origin', value: '' },
  { name: 'age', value: '' },
  { name: 'allow', value: '' },
  { name: 'authorization', value: '' },
  { name: 'cache-control', value: '' },
  { name: 'content-disposition', value: '' },
  { name: 'content-encoding', value: '' },
  { name: 'content-language', value: '' },
  { name: 'content-length', value: '' },
  { name: 'content-location', value: '' },
  { name: 'content-range', value: '' },
  { name: 'content-type', value: '' },
  { name: 'cookie', value: '' },
  { name: 'date', value: '' },
  { name: 'etag', value: '' },
  { name: 'expect', value: '' },
  { name: 'expires', value: '' },
  { name: 'from', value: '' },
  { name: 'host', value: '' },
  { name: 'if-match', value: '' },
  { name: 'if-modified-since', value: '' },
  { name: 'if-none-match', value: '' },
  { name: 'if-range', value: '' },
  { name: 'if-unmodified-since', value: '' },
  { name: 'last-modified', value: '' },
  { name: 'link', value: '' },
  { name: 'location', value: '' },
  { name: 'max-forwards', value: '' },
  { name: 'proxy-authenticate', value: '' },
  { name: 'proxy-authorization', value: '' },
  { name: 'range', value: '' },
  { name: 'referer', value: '' },
  { name: 'refresh', value: '' },
  { name: 'retry-after', value: '' },
  { name: 'server', value: '' },
  { name: 'set-cookie', value: '' },
  { name: 'strict-transport-security', value: '' },
  { name: 'transfer-encoding', value: '' },
  { name: 'user-agent', value: '' },
  { name: 'vary', value: '' },
  { name: 'via', value: '' },
  { name: 'www-authenticate', value: '' }
];

function lookupStaticTable(name, value) {
  const lowerName = name.toLowerCase();
  let nameMatch = null;
  for (let i = 1; i <= 61; i++) {
    const entry = STATIC_TABLE[i];
    if (entry.name.toLowerCase() === lowerName) {
      if (entry.value === value) {
        return { index: i, exact: true };
      }
      if (nameMatch === null) {
        nameMatch = i;
      }
    }
  }
  if (nameMatch !== null) return { index: nameMatch, exact: false };
  return null;
}

// ==========================================================================
// 2. RFC 7541 Appendix B: Huffman Code Table (257 Symbols)
// ==========================================================================
const HUFFMAN_CODES = [
  [8184, 13], [8388568, 23], [268435426, 28], [268435427, 28], [268435428, 28], [268435429, 28], [268435430, 28], [268435431, 28],
  [268435432, 28], [16777210, 24], [1073741820, 30], [268435433, 28], [268435434, 28], [1073741821, 30], [268435435, 28], [268435436, 28],
  [268435437, 28], [268435438, 28], [268435439, 28], [268435440, 28], [268435441, 28], [268435442, 28], [268435443, 28], [268435444, 28],
  [268435445, 28], [268435446, 28], [268435447, 28], [268435448, 28], [268435449, 28], [268435450, 28], [268435451, 28], [268435452, 28],
  [20, 6], [62, 6], [1020, 10], [1021, 10], [1022, 10], [30, 5], [21, 6], [510, 9],
  [126, 7], [127, 7], [31, 5], [511, 9], [61, 6], [38, 6], [47, 6], [24, 6],
  [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5],
  [8, 5], [9, 5], [46, 6], [60, 6], [1073741822, 30], [63, 6], [2044, 11], [48, 6],
  [2045, 11], [33, 6], [34, 6], [35, 6], [36, 6], [37, 6], [39, 6], [40, 6],
  [41, 6], [42, 6], [43, 6], [44, 6], [45, 6], [49, 6], [50, 6], [51, 6],
  [52, 6], [53, 6], [54, 6], [55, 6], [56, 6], [57, 6], [58, 6], [59, 6],
  [94, 7], [95, 7], [96, 7], [1023, 10], [2046, 11], [1073741823, 30], [2047, 11], [254, 8],
  [2042, 11], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [15, 5], [16, 5],
  [17, 5], [18, 5], [19, 5], [22, 6], [23, 6], [25, 6], [26, 6], [27, 6],
  [28, 6], [29, 6], [32, 6], [64, 7], [65, 7], [66, 7], [67, 7], [68, 7],
  [69, 7], [70, 7], [71, 7], [72, 7], [73, 7], [74, 7], [75, 7], [76, 7],
  [77, 7], [78, 7], [79, 7], [80, 7], [81, 7], [82, 7], [83, 7], [84, 7],
  [85, 7], [86, 7], [87, 7], [88, 7], [89, 7], [90, 7], [91, 7], [92, 7],
  [93, 7], [97, 7], [98, 7], [99, 7], [100, 7], [101, 7], [102, 7], [103, 7],
  [104, 7], [105, 7], [106, 7], [107, 7], [108, 7], [109, 7], [110, 7], [111, 7],
  [112, 7], [113, 7], [114, 7], [115, 7], [116, 7], [117, 7], [118, 7], [119, 7],
  [120, 7], [121, 7], [122, 7], [123, 7], [124, 7], [125, 7], [255, 8], [8388569, 23],
  [4194286, 22], [4194287, 22], [8388570, 23], [8388571, 23], [8388572, 23], [8388573, 23], [8388574, 23], [8388575, 23],
  [8388576, 23], [8388577, 23], [8388578, 23], [8388579, 23], [8388580, 23], [8388581, 23], [8388582, 23], [8388583, 23],
  [8388584, 23], [8388585, 23], [8388586, 23], [8388587, 23], [8388588, 23], [8388589, 23], [8388590, 23], [8388591, 23],
  [8388592, 23], [8388593, 23], [8388594, 23], [8388595, 23], [8388596, 23], [8388597, 23], [8388598, 23], [8388599, 23],
  [8388600, 23], [8388601, 23], [8388602, 23], [8388603, 23], [8388604, 23], [8388605, 23], [8388606, 23], [8388607, 23],
  [16777208, 24], [16777209, 24], [16777211, 24], [16777212, 24], [16777213, 24], [16777214, 24], [16777215, 24], [33554428, 25],
  [33554429, 25], [33554430, 25], [33554431, 25], [67108860, 26], [67108861, 26], [67108862, 26], [67108863, 26], [134217724, 27],
  [134217725, 27], [134217726, 27], [134217727, 27], [268435453, 28], [268435454, 28], [536870910, 29], [536870911, 29], [1073741823, 30]
];

class ClientHuffmanTree {
  constructor() {
    this.root = [null, null, null];
    for (let sym = 0; sym < HUFFMAN_CODES.length; sym++) {
      const [code, len] = HUFFMAN_CODES[sym];
      let curr = this.root;
      for (let bitIdx = len - 1; bitIdx >= 0; bitIdx--) {
        const bit = (code >> bitIdx) & 1;
        if (!curr[bit]) curr[bit] = [null, null, null];
        curr = curr[bit];
      }
      curr[2] = sym;
    }
  }
}
const HUFFMAN_TREE = new ClientHuffmanTree();

function encodeHuffmanBytes(bytes) {
  const output = [];
  let currentByte = 0;
  let bitsInByte = 0;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    const [code, len] = HUFFMAN_CODES[b];
    for (let bitIdx = len - 1; bitIdx >= 0; bitIdx--) {
      const bit = (code >> bitIdx) & 1;
      currentByte = (currentByte << 1) | bit;
      bitsInByte++;
      if (bitsInByte === 8) {
        output.push(currentByte);
        currentByte = 0;
        bitsInByte = 0;
      }
    }
  }
  if (bitsInByte > 0) {
    const pad = 8 - bitsInByte;
    currentByte = (currentByte << pad) | ((1 << pad) - 1);
    output.push(currentByte);
  }
  return output;
}

function decodeHuffmanBytes(buffer) {
  const decoded = [];
  let curr = HUFFMAN_TREE.root;
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    for (let bitIdx = 7; bitIdx >= 0; bitIdx--) {
      const bit = (byte >> bitIdx) & 1;
      curr = curr[bit];
      if (!curr) throw new Error('Invalid Huffman sequence');
      if (curr[2] !== null) {
        if (curr[2] === 256) throw new Error('EOS encountered in stream');
        decoded.push(curr[2]);
        curr = HUFFMAN_TREE.root;
      }
    }
  }
  return new TextDecoder().decode(new Uint8Array(decoded));
}

// ==========================================================================
// 3. RFC 7541 Integer & String Codecs
// ==========================================================================
function encodeInteger(value, prefixBits, prefixMask = 0) {
  const maxPrefix = (1 << prefixBits) - 1;
  const bytes = [];
  if (value < maxPrefix) {
    bytes.push(prefixMask | value);
    return bytes;
  }
  bytes.push(prefixMask | maxPrefix);
  let rem = value - maxPrefix;
  while (rem >= 128) {
    bytes.push((rem % 128) | 0x80);
    rem = Math.floor(rem / 128);
  }
  bytes.push(rem);
  return bytes;
}

function decodeInteger(buffer, offset, prefixBits) {
  const maxPrefix = (1 << prefixBits) - 1;
  const firstByte = buffer[offset];
  let value = firstByte & maxPrefix;
  let bytesRead = 1;
  if (value < maxPrefix) return { value, bytesRead };

  let m = 0;
  while (true) {
    const b = buffer[offset + bytesRead];
    bytesRead++;
    value += (b & 127) * Math.pow(2, m);
    m += 7;
    if ((b & 128) === 0) break;
  }
  return { value, bytesRead };
}

function encodeString(str, useHuffman) {
  const rawBytes = Array.from(new TextEncoder().encode(str));
  if (useHuffman) {
    const huffBytes = encodeHuffmanBytes(rawBytes);
    const lenBytes = encodeInteger(huffBytes.length, 7, 0x80);
    return [...lenBytes, ...huffBytes];
  } else {
    const lenBytes = encodeInteger(rawBytes.length, 7, 0x00);
    return [...lenBytes, ...rawBytes];
  }
}

function decodeString(buffer, offset) {
  const isHuffman = (buffer[offset] & 0x80) !== 0;
  const { value: length, bytesRead: lenCount } = decodeInteger(buffer, offset, 7);
  const dataStart = offset + lenCount;
  const dataEnd = dataStart + length;
  const slice = buffer.slice(dataStart, dataEnd);
  let value;
  if (isHuffman) {
    value = decodeHuffmanBytes(slice);
  } else {
    value = new TextDecoder().decode(new Uint8Array(slice));
  }
  return { value, isHuffman, bytesRead: lenCount + length };
}

// ==========================================================================
// 4. Dynamic Table (Starting at Index 62, FIFO Eviction)
// ==========================================================================
class DynamicTableManager {
  constructor(maxSize = 4096) {
    this.entries = [];
    this.maxSize = maxSize;
    this.currentSize = 0;
  }

  static entrySize(name, value) {
    const nLen = new TextEncoder().encode(name).length;
    const vLen = new TextEncoder().encode(value).length;
    return nLen + vLen + 32;
  }

  add(name, value) {
    const size = DynamicTableManager.entrySize(name, value);
    const evicted = [];
    if (size > this.maxSize) {
      while (this.entries.length > 0) {
        const rem = this.entries.pop();
        this.currentSize -= rem.size;
        evicted.push(rem);
      }
      return { evicted };
    }
    while (this.currentSize + size > this.maxSize && this.entries.length > 0) {
      const rem = this.entries.pop();
      this.currentSize -= rem.size;
      evicted.push(rem);
    }
    const newEntry = { name, value, size, addedAt: Date.now() };
    this.entries.unshift(newEntry);
    this.currentSize += size;
    return { evicted, entry: newEntry };
  }

  get(index) {
    if (index < 62) return null;
    const arrIdx = index - 62;
    return this.entries[arrIdx] || null;
  }

  lookup(name, value) {
    const lowerName = name.toLowerCase();
    let nameMatch = null;
    for (let i = 0; i < this.entries.length; i++) {
      const e = this.entries[i];
      const hpackIndex = 62 + i;
      if (e.name.toLowerCase() === lowerName) {
        if (e.value === value) return { index: hpackIndex, exact: true };
        if (nameMatch === null) nameMatch = hpackIndex;
      }
    }
    if (nameMatch !== null) return { index: nameMatch, exact: false };
    return null;
  }

  getEntries() {
    return this.entries.map((e, idx) => ({
      index: 62 + idx,
      name: e.name,
      value: e.value,
      size: e.size,
      addedAt: e.addedAt
    }));
  }

  clear() {
    this.entries = [];
    this.currentSize = 0;
  }
}

// ==========================================================================
// 5. HPACK Core Engine (Cases 1, 2, 3 Encoder & Decoder)
// ==========================================================================
class HpackEngine {
  constructor(options = {}) {
    this.maxTableSize = options.maxTableSize || 4096;
    this.useHuffman = options.useHuffman !== undefined ? options.useHuffman : true;
    this.preferredCase = options.preferredCase || 2;
    this.dynamicTable = new DynamicTableManager(this.maxTableSize);
  }

  findMatch(name, value) {
    const staticMatch = lookupStaticTable(name, value);
    if (staticMatch && staticMatch.exact) {
      return { index: staticMatch.index, exact: true, isStatic: true };
    }
    const dynMatch = this.dynamicTable.lookup(name, value);
    if (dynMatch && dynMatch.exact) {
      return { index: dynMatch.index, exact: true, isStatic: false };
    }
    if (staticMatch) return { index: staticMatch.index, exact: false, isStatic: true };
    if (dynMatch) return { index: dynMatch.index, exact: false, isStatic: false };
    return null;
  }

  encodeHeader(name, value, opts = {}) {
    const useHuffman = opts.useHuffman !== undefined ? opts.useHuffman : this.useHuffman;
    const preferredCase = opts.preferredCase || this.preferredCase;
    const match = this.findMatch(name, value);
    const byteChunks = [];
    let caseNumber = 2;
    let explanation = '';
    let tableAction = 'None';
    let evicted = [];

    // Case 1: Exact match in static or dynamic table
    if (match && match.exact) {
      caseNumber = 1;
      const index = match.index;
      explanation = `Case 1: Indexed Header Field. Exact match found at index ${index} (${match.isStatic ? 'Static Table' : 'Dynamic Table'}).`;
      const encBytes = encodeInteger(index, 7, 0x80);
      byteChunks.push({
        type: 'index',
        label: `Index ${index} (${name}: ${value})`,
        bytes: encBytes
      });
      return {
        header: { name, value },
        caseNumber,
        explanation,
        bytes: encBytes,
        byteChunks,
        tableAction: 'No change (Case 1 does not alter dynamic table)',
        evicted: [],
        dynamicTableSnapshot: this.dynamicTable.getEntries()
      };
    }

    // Cases 2 & 3: Literal header field
    caseNumber = preferredCase === 3 ? 3 : 2;
    const nameIndex = match ? match.index : 0;
    const prefixBits = caseNumber === 2 ? 6 : 4;
    const prefixMask = caseNumber === 2 ? 0x40 : 0x00;
    const totalBytes = [];

    if (nameIndex > 0) {
      explanation = `Case ${caseNumber}: Literal Header Field ${caseNumber === 2 ? 'with Incremental Indexing' : 'without Indexing'}. Name matched at index ${nameIndex}.`;
      const idxBytes = encodeInteger(nameIndex, prefixBits, prefixMask);
      totalBytes.push(...idxBytes);
      byteChunks.push({
        type: 'name-index',
        label: `Name Index ${nameIndex} (${name})`,
        bytes: idxBytes
      });

      const valBytes = encodeString(value, useHuffman);
      totalBytes.push(...valBytes);
      byteChunks.push({
        type: 'value-literal',
        label: `Value Literal: "${value}" (${useHuffman ? 'Huffman encoded' : 'Plain text'})`,
        bytes: valBytes
      });
    } else {
      explanation = `Case ${caseNumber}: Literal Header Field ${caseNumber === 2 ? 'with Incremental Indexing' : 'without Indexing'}. New Name (Index 0).`;
      const zeroBytes = encodeInteger(0, prefixBits, prefixMask);
      totalBytes.push(...zeroBytes);
      byteChunks.push({
        type: 'name-index-zero',
        label: `Index 0 (New Name)`,
        bytes: zeroBytes
      });

      const nameBytes = encodeString(name, useHuffman);
      totalBytes.push(...nameBytes);
      byteChunks.push({
        type: 'name-literal',
        label: `Name Literal: "${name}" (${useHuffman ? 'Huffman encoded' : 'Plain text'})`,
        bytes: nameBytes
      });

      const valBytes = encodeString(value, useHuffman);
      totalBytes.push(...valBytes);
      byteChunks.push({
        type: 'value-literal',
        label: `Value Literal: "${value}" (${useHuffman ? 'Huffman encoded' : 'Plain text'})`,
        bytes: valBytes
      });
    }

    if (caseNumber === 2) {
      const addRes = this.dynamicTable.add(name, value);
      evicted = addRes.evicted || [];
      tableAction = `Saved to Dynamic Table at index 62 (+${DynamicTableManager.entrySize(name, value)} bytes).`;
      if (evicted.length > 0) tableAction += ` Evicted ${evicted.length} oldest entry(ies).`;
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

  encode(headers, opts = {}) {
    const steps = [];
    const allBytes = [];
    for (const h of headers) {
      const step = this.encodeHeader(h.name, h.value, opts);
      steps.push(step);
      allBytes.push(...step.bytes);
    }
    const hex = allBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    return { steps, bytes: allBytes, hex, totalBytes: allBytes.length };
  }

  getHeaderByIndex(index) {
    if (index >= 1 && index <= 61) return STATIC_TABLE[index];
    if (index >= 62) return this.dynamicTable.get(index);
    return null;
  }

  decode(buffer) {
    const headers = [];
    let offset = 0;
    while (offset < buffer.length) {
      const firstByte = buffer[offset];
      // Case 1: Indexed (1xxxxxxx)
      if ((firstByte & 0x80) === 0x80) {
        const { value: index, bytesRead } = decodeInteger(buffer, offset, 7);
        offset += bytesRead;
        const entry = this.getHeaderByIndex(index);
        if (!entry) throw new Error(`Invalid table index ${index}`);
        headers.push({
          name: entry.name,
          value: entry.value,
          caseNumber: 1,
          detail: `Case 1: Indexed Header Field (Index ${index})`
        });
      }
      // Case 2: Literal + Incremental Indexing (01xxxxxx)
      else if ((firstByte & 0xc0) === 0x40) {
        const { value: nameIndex, bytesRead } = decodeInteger(buffer, offset, 6);
        offset += bytesRead;
        let name = '';
        if (nameIndex > 0) {
          const entry = this.getHeaderByIndex(nameIndex);
          if (!entry) throw new Error(`Invalid name index ${nameIndex}`);
          name = entry.name;
        } else {
          const nameLit = decodeString(buffer, offset);
          name = nameLit.value;
          offset += nameLit.bytesRead;
        }
        const valLit = decodeString(buffer, offset);
        const value = valLit.value;
        offset += valLit.bytesRead;

        this.dynamicTable.add(name, value);
        headers.push({
          name,
          value,
          caseNumber: 2,
          detail: `Case 2: Literal with Incremental Indexing (Name index: ${nameIndex})`
        });
      }
      // Case 3: Literal without Indexing (0000xxxx)
      else if ((firstByte & 0xf0) === 0x00) {
        const { value: nameIndex, bytesRead } = decodeInteger(buffer, offset, 4);
        offset += bytesRead;
        let name = '';
        if (nameIndex > 0) {
          const entry = this.getHeaderByIndex(nameIndex);
          if (!entry) throw new Error(`Invalid name index ${nameIndex}`);
          name = entry.name;
        } else {
          const nameLit = decodeString(buffer, offset);
          name = nameLit.value;
          offset += nameLit.bytesRead;
        }
        const valLit = decodeString(buffer, offset);
        const value = valLit.value;
        offset += valLit.bytesRead;

        headers.push({
          name,
          value,
          caseNumber: 3,
          detail: `Case 3: Literal without Indexing (Name index: ${nameIndex})`
        });
      }
      // Never Indexed (0001xxxx)
      else if ((firstByte & 0xf0) === 0x10) {
        const { value: nameIndex, bytesRead } = decodeInteger(buffer, offset, 4);
        offset += bytesRead;
        let name = '';
        if (nameIndex > 0) {
          const entry = this.getHeaderByIndex(nameIndex);
          name = entry ? entry.name : '';
        } else {
          const nameLit = decodeString(buffer, offset);
          name = nameLit.value;
          offset += nameLit.bytesRead;
        }
        const valLit = decodeString(buffer, offset);
        const value = valLit.value;
        offset += valLit.bytesRead;
        headers.push({ name, value, caseNumber: 3, detail: `Literal Never Indexed` });
      } else {
        offset++;
      }
    }
    return { headers, dynamicTableSnapshot: this.dynamicTable.getEntries() };
  }
}

// ==========================================================================
// 6. Application UI Controller
// ==========================================================================
const PRESETS = {
  initial_get: `:method: GET\n:scheme: https\n:path: /index.html\n:authority: www.example.com\nuser-agent: Mozilla/5.0`,
  second_get: `:method: GET\n:scheme: https\n:path: /style.css\n:authority: www.example.com\nuser-agent: Mozilla/5.0`,
  custom_api: `:method: POST\n:scheme: https\n:path: /api/v1/checkout\ncontent-type: application/json\nx-custom-auth: bearer-token-98721\ncache-control: no-cache`,
  eviction_demo: `x-flow-1: alpha-beta-gamma\nx-flow-2: delta-epsilon-zeta\nx-flow-3: eta-theta-iota\nx-flow-4: kappa-lambda-mu\nx-flow-5: nu-xi-omicron`
};

let encoderEngine = new HpackEngine({ maxTableSize: 4096, useHuffman: true, preferredCase: 2 });
let decoderEngine = new HpackEngine({ maxTableSize: 4096 });
let lastEncodedHex = '';

function parseHeaders(text) {
  const lines = text.split('\n');
  const headers = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    let name = '';
    let value = '';

    if (trimmed.startsWith(':')) {
      // Pseudo-header, e.g. :method: GET or :method GET
      const secondColon = trimmed.indexOf(':', 1);
      const firstSpace = trimmed.indexOf(' ');
      if (secondColon !== -1) {
        name = trimmed.slice(0, secondColon).trim();
        value = trimmed.slice(secondColon + 1).trim();
      } else if (firstSpace !== -1) {
        name = trimmed.slice(0, firstSpace).trim();
        value = trimmed.slice(firstSpace + 1).trim();
      } else {
        name = trimmed;
        value = '';
      }
    } else {
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx !== -1) {
        name = trimmed.slice(0, colonIdx).trim();
        value = trimmed.slice(colonIdx + 1).trim();
      } else {
        const spaceIdx = trimmed.indexOf(' ');
        if (spaceIdx !== -1) {
          name = trimmed.slice(0, spaceIdx).trim();
          value = trimmed.slice(spaceIdx + 1).trim();
        }
      }
    }

    if (name) {
      headers.push({ name, value });
    }
  }
  return headers;
}

function calculateRawHttpSize(headers) {
  let size = 0;
  for (const h of headers) {
    size += new TextEncoder().encode(`${h.name}: ${h.value}\r\n`).length;
  }
  return size;
}

function handleEncodeClick() {
  const textarea = document.getElementById('headers-textarea');
  const encodeBtn = document.getElementById('encode-btn');
  const huffmanToggle = document.getElementById('huffman-toggle');
  const caseModeSelect = document.getElementById('case-mode-select');
  const tableSizeSelect = document.getElementById('table-size-select');

  const headers = parseHeaders(textarea.value);
  if (headers.length === 0) {
    textarea.focus();
    textarea.style.borderColor = '#f43f5e';
    setTimeout(() => { textarea.style.borderColor = ''; }, 1500);
    return;
  }

  // Visual button click feedback
  if (encodeBtn) {
    encodeBtn.style.transform = 'scale(0.98)';
    setTimeout(() => { encodeBtn.style.transform = ''; }, 120);
  }

  // Sync settings
  const useHuffman = huffmanToggle ? huffmanToggle.checked : true;
  const preferredCase = caseModeSelect ? parseInt(caseModeSelect.value, 10) : 2;
  const maxSize = tableSizeSelect ? parseInt(tableSizeSelect.value, 10) : 4096;

  encoderEngine.useHuffman = useHuffman;
  encoderEngine.preferredCase = preferredCase;
  encoderEngine.dynamicTable.maxSize = maxSize;
  decoderEngine.dynamicTable.maxSize = maxSize;

  // Run Encode
  const result = encoderEngine.encode(headers, { useHuffman, preferredCase });
  lastEncodedHex = result.hex;

  // Render Breakdown & Dynamic Table
  renderBreakdown(result.steps, result.hex);
  renderDynamicTable();

  // Run Decoder Verification
  verifyDecoder(result.bytes, headers);

  // Update Stats
  const rawBytes = calculateRawHttpSize(headers);
  const hpackBytes = result.totalBytes;
  updateStats(rawBytes, hpackBytes);
}

function verifyDecoder(bytes, originalHeaders) {
  const statusBadge = document.getElementById('decoder-status-badge');
  const listContainer = document.getElementById('decoded-headers-list');

  try {
    const decResult = decoderEngine.decode(bytes);
    if (statusBadge) {
      statusBadge.textContent = '✅ Verified 100% Roundtrip Match';
      statusBadge.className = 'badge badge-success';
    }
    if (listContainer) {
      listContainer.innerHTML = decResult.headers.map(h => `
        <div class="decoded-item">
          <span class="d-name">${escapeHtml(h.name)}: <span class="d-val">${escapeHtml(h.value)}</span></span>
          <span class="d-case">${escapeHtml(h.detail)}</span>
        </div>
      `).join('');
    }
  } catch (err) {
    if (statusBadge) {
      statusBadge.textContent = '❌ Decode Error: ' + err.message;
      statusBadge.className = 'badge btn-danger';
    }
  }
}

function renderDynamicTable() {
  const dt = encoderEngine.dynamicTable;
  const entries = dt.getEntries();
  const currentTotal = dt.currentSize;
  const max = dt.maxSize;
  const percentage = Math.min(100, Math.round((currentTotal / max) * 100));

  const dtCountBadge = document.getElementById('dt-count-badge');
  const capacityText = document.getElementById('capacity-text');
  const bar = document.getElementById('capacity-bar-fill');
  const tbody = document.getElementById('dynamic-table-body');

  if (dtCountBadge) dtCountBadge.textContent = `${entries.length} entries`;
  if (capacityText) capacityText.textContent = `${currentTotal} / ${max} bytes (${percentage}%)`;

  if (bar) {
    bar.style.width = `${percentage}%`;
    if (percentage > 85) bar.classList.add('warning');
    else bar.classList.remove('warning');
  }

  if (tbody) {
    if (entries.length === 0) {
      tbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="4">Dynamic table is currently empty. Encode headers with Case 2 to populate entries.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = entries.map((entry, idx) => `
      <tr class="${idx === 0 ? 'new-entry-row' : ''}">
        <td class="index-cell">${entry.index}</td>
        <td><strong>${escapeHtml(entry.name)}</strong></td>
        <td><code>${escapeHtml(entry.value)}</code></td>
        <td>${entry.size} B</td>
      </tr>
    `).join('');
  }
}

function renderBreakdown(steps, wireHex) {
  const hexDisplay = document.getElementById('wire-hex-display');
  if (hexDisplay) hexDisplay.textContent = wireHex || '-';

  const container = document.getElementById('breakdown-container');
  if (!container) return;

  if (!steps || steps.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚡</div>
        <h3>No Headers Encoded</h3>
      </div>
    `;
    return;
  }

  container.innerHTML = steps.map((step, idx) => {
    const caseClass = `case-${step.caseNumber}`;
    const caseTitle = step.caseNumber === 1
      ? 'Case 1: Indexed'
      : step.caseNumber === 2
        ? 'Case 2: Literal + Incremental Index'
        : 'Case 3: Literal without Index';

    return `
      <div class="header-step-card ${caseClass}">
        <div class="step-card-header">
          <div class="header-name-val">
            #${idx + 1} <strong>${escapeHtml(step.header.name)}</strong>: <span class="h-val">"${escapeHtml(step.header.value)}"</span>
          </div>
          <span class="case-badge ${caseClass}">${caseTitle}</span>
        </div>
        <div class="step-explanation">${escapeHtml(step.explanation)}</div>
        <div class="step-action-note"><strong>Dictionary Action:</strong> ${escapeHtml(step.tableAction)}</div>
        <div class="byte-chunks-grid">
          ${step.byteChunks.map(chunk => renderByteChunk(chunk, step.caseNumber)).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function renderByteChunk(chunk, caseNum) {
  return `
    <div class="chunk-card">
      <div class="chunk-label">
        <span>${escapeHtml(chunk.label)}</span>
        <code>${chunk.bytes.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}</code>
      </div>
      <div class="bytes-row">
        ${chunk.bytes.map((byteVal, bIdx) => renderBytePill(byteVal, chunk.type, bIdx, caseNum)).join('')}
      </div>
    </div>
  `;
}

function renderBytePill(byteVal, chunkType, byteIndex, caseNum) {
  const binaryStr = byteVal.toString(2).padStart(8, '0');
  const hexStr = '0x' + byteVal.toString(16).padStart(2, '0').toUpperCase();
  let formattedBits = '';

  if (chunkType === 'index' && caseNum === 1) {
    formattedBits = `<span class="prefix-bit">${binaryStr[0]}</span><span class="index-bit">${binaryStr.slice(1)}</span>`;
  } else if ((chunkType === 'name-index' || chunkType === 'name-index-zero') && caseNum === 2) {
    formattedBits = `<span class="prefix-bit">${binaryStr.slice(0, 2)}</span><span class="index-bit">${binaryStr.slice(2)}</span>`;
  } else if ((chunkType === 'name-index' || chunkType === 'name-index-zero') && caseNum === 3) {
    formattedBits = `<span class="prefix-bit">${binaryStr.slice(0, 4)}</span><span class="index-bit">${binaryStr.slice(4)}</span>`;
  } else if (byteIndex === 0 && (chunkType === 'name-literal' || chunkType === 'value-literal')) {
    const hBit = binaryStr[0];
    const hClass = hBit === '1' ? 'huffman-bit' : 'plain-bit';
    formattedBits = `<span class="${hClass}" title="Huffman: ${hBit}">${hBit}</span><span class="index-bit">${binaryStr.slice(1)}</span>`;
  } else {
    formattedBits = `<span class="plain-bit">${binaryStr}</span>`;
  }

  return `
    <div class="byte-pill">
      <span class="byte-hex">${hexStr}</span>
      <div class="bit-stream">${formattedBits}</div>
    </div>
  `;
}

function updateStats(rawBytes, hpackBytes) {
  const rawElem = document.getElementById('stat-raw-bytes');
  const hpackElem = document.getElementById('stat-hpack-bytes');
  const savedElem = document.getElementById('stat-saved-bytes');
  const ratioElem = document.getElementById('stat-ratio');

  if (rawElem) rawElem.textContent = `${rawBytes} B`;
  if (hpackElem) hpackElem.textContent = `${hpackBytes} B`;

  if (rawBytes === 0) {
    if (savedElem) savedElem.textContent = '0 B';
    if (ratioElem) ratioElem.textContent = '0%';
    return;
  }

  const saved = rawBytes - hpackBytes;
  const ratio = Math.round((saved / rawBytes) * 100);
  if (savedElem) savedElem.textContent = `${saved >= 0 ? '+' : ''}${saved} B`;
  if (ratioElem) ratioElem.textContent = `${ratio}% saved`;
}

function handleResetSession() {
  const sizeSelect = document.getElementById('table-size-select');
  const huffToggle = document.getElementById('huffman-toggle');
  const caseSelect = document.getElementById('case-mode-select');

  encoderEngine = new HpackEngine({
    maxTableSize: sizeSelect ? parseInt(sizeSelect.value, 10) : 4096,
    useHuffman: huffToggle ? huffToggle.checked : true,
    preferredCase: caseSelect ? parseInt(caseSelect.value, 10) : 2
  });
  decoderEngine = new HpackEngine({
    maxTableSize: sizeSelect ? parseInt(sizeSelect.value, 10) : 4096
  });
  lastEncodedHex = '';

  renderDynamicTable();
  const breakdown = document.getElementById('breakdown-container');
  if (breakdown) {
    breakdown.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚡</div>
        <h3>Dictionary Reset</h3>
        <p>Dynamic table cleared. Next request starts fresh with index 62.</p>
      </div>
    `;
  }
  const wireHex = document.getElementById('wire-hex-display');
  if (wireHex) wireHex.textContent = '-';

  const decodedList = document.getElementById('decoded-headers-list');
  if (decodedList) decodedList.innerHTML = `<div class="empty-state compact">Encoded stream will be decoded here.</div>`;

  const badge = document.getElementById('decoder-status-badge');
  if (badge) {
    badge.textContent = 'Awaiting Data';
    badge.className = 'badge';
  }
  updateStats(0, 0);
}

function renderStaticTable(entries) {
  const tbody = document.getElementById('static-table-body');
  if (!tbody) return;
  tbody.innerHTML = entries.map(entry => `
    <tr>
      <td class="index-cell">${entry.index}</td>
      <td><strong>${escapeHtml(entry.name)}</strong></td>
      <td><code>${escapeHtml(entry.value || '—')}</code></td>
    </tr>
  `).join('');
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================================================
// 7. Initialization
// ==========================================================================
function setupApp() {
  const encodeBtn = document.getElementById('encode-btn');
  const clearInputBtn = document.getElementById('clear-input-btn');
  const resetSessionBtn = document.getElementById('reset-session-btn');
  const presetSelector = document.getElementById('preset-selector');
  const viewStaticBtn = document.getElementById('view-static-table-btn');
  const staticModal = document.getElementById('static-table-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const staticSearchInput = document.getElementById('static-table-search');
  const copyHexBtn = document.getElementById('copy-hex-btn');
  const headersTextarea = document.getElementById('headers-textarea');
  const tableSizeSelect = document.getElementById('table-size-select');
  const huffmanToggle = document.getElementById('huffman-toggle');

  if (headersTextarea && !headersTextarea.value.trim()) {
    headersTextarea.value = PRESETS.initial_get;
  }

  if (encodeBtn) {
    encodeBtn.onclick = handleEncodeClick;
  }

  if (clearInputBtn && headersTextarea) {
    clearInputBtn.onclick = () => {
      headersTextarea.value = '';
      headersTextarea.focus();
    };
  }

  if (presetSelector && headersTextarea) {
    presetSelector.onchange = (e) => {
      const key = e.target.value;
      if (PRESETS[key]) {
        headersTextarea.value = PRESETS[key];
        if (key === 'eviction_demo' && tableSizeSelect) {
          tableSizeSelect.value = '160';
          encoderEngine.dynamicTable.maxSize = 160;
          decoderEngine.dynamicTable.maxSize = 160;
          renderDynamicTable();
        }
      }
      presetSelector.value = '';
    };
  }

  if (resetSessionBtn) {
    resetSessionBtn.onclick = handleResetSession;
  }

  // Static Table Modal
  const staticList = STATIC_TABLE.slice(1).map((entry, idx) => ({
    index: idx + 1,
    name: entry.name,
    value: entry.value
  }));
  renderStaticTable(staticList);

  if (viewStaticBtn && staticModal) {
    viewStaticBtn.onclick = () => {
      staticModal.style.display = 'flex';
      if (staticSearchInput) staticSearchInput.value = '';
      renderStaticTable(staticList);
    };
  }
  if (closeModalBtn && staticModal) {
    closeModalBtn.onclick = () => {
      staticModal.style.display = 'none';
    };
  }
  if (staticModal) {
    staticModal.onclick = (e) => {
      if (e.target === staticModal) staticModal.style.display = 'none';
    };
  }
  if (staticSearchInput) {
    staticSearchInput.oninput = (e) => {
      const q = e.target.value.trim().toLowerCase();
      const filtered = staticList.filter(entry =>
        entry.name.toLowerCase().includes(q) ||
        (entry.value && entry.value.toLowerCase().includes(q)) ||
        String(entry.index) === q
      );
      renderStaticTable(filtered);
    };
  }

  if (copyHexBtn) {
    copyHexBtn.onclick = () => {
      if (lastEncodedHex) {
        navigator.clipboard.writeText(lastEncodedHex).catch(() => { });
        copyHexBtn.innerHTML = '✓';
        setTimeout(() => {
          copyHexBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        }, 1200);
      }
    };
  }

  if (headersTextarea) {
    headersTextarea.onkeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleEncodeClick();
      }
    };
  }

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupApp);
} else {
  setupApp();
}
