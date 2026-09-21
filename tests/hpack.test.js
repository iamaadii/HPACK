import test from 'node:test';
import assert from 'node:assert/strict';
import { STATIC_TABLE, lookupStaticTable } from '../lib/staticTable.js';
import { encodeInteger, decodeInteger } from '../lib/integerCodec.js';
import { encodeHuffman, decodeHuffman, encodeStringLiteral, decodeStringLiteral } from '../lib/huffmanCodec.js';
import { DynamicTable } from '../lib/dynamicTable.js';
import { HpackContext } from '../lib/hpack.js';

test('1. Static Table has 61 entries and accurate lookups', () => {
  assert.equal(STATIC_TABLE.length, 62); // 0 index is null
  assert.equal(STATIC_TABLE[1].name, ':authority');
  assert.equal(STATIC_TABLE[2].name, ':method');
  assert.equal(STATIC_TABLE[2].value, 'GET');
  assert.equal(STATIC_TABLE[61].name, 'www-authenticate');

  // Exact lookup
  const getMatch = lookupStaticTable(':method', 'GET');
  assert.ok(getMatch);
  assert.equal(getMatch.index, 2);
  assert.equal(getMatch.exact, true);

  // Name only lookup
  const pathMatch = lookupStaticTable(':path', '/custom/endpoint');
  assert.ok(pathMatch);
  assert.equal(pathMatch.index, 4); // :path / is index 4
  assert.equal(pathMatch.exact, false);
});

test('2. RFC 7541 Integer Codec - Appendix C.1 Examples', () => {
  // C.1.1: 10 using 5-bit prefix -> 0x0a (10)
  const enc1 = encodeInteger(10, 5);
  assert.deepEqual(enc1, [10]);
  const dec1 = decodeInteger(enc1, 0, 5);
  assert.equal(dec1.value, 10);
  assert.equal(dec1.bytesRead, 1);

  // C.1.2: 1337 using 5-bit prefix -> [0x1f, 0x9a, 0x0a]
  const enc2 = encodeInteger(1337, 5);
  assert.deepEqual(enc2, [31, 154, 10]);
  const dec2 = decodeInteger(enc2, 0, 5);
  assert.equal(dec2.value, 1337);
  assert.equal(dec2.bytesRead, 3);

  // C.1.3: 42 starting at octet boundary (8-bit prefix) -> [0x2a]
  const enc3 = encodeInteger(42, 8);
  assert.deepEqual(enc3, [42]);
  const dec3 = decodeInteger(enc3, 0, 8);
  assert.equal(dec3.value, 42);
  assert.equal(dec3.bytesRead, 1);
});

test('3. Case 1: Indexed Header Field encode and decode', () => {
  const encCtx = new HpackContext();
  const decCtx = new HpackContext();

  // :method: GET is static index 2 -> 0x82 (10000010)
  const res = encCtx.encodeHeader(':method', 'GET');
  assert.equal(res.caseNumber, 1);
  assert.deepEqual(res.bytes, [0x82]);

  // Decode
  const decoded = decCtx.decode(res.bytes);
  assert.equal(decoded.headers.length, 1);
  assert.equal(decoded.headers[0].name, ':method');
  assert.equal(decoded.headers[0].value, 'GET');
  assert.equal(decoded.headers[0].caseNumber, 1);
});

test('4. Cases 2 and 3 with plain text (Huffman OFF)', () => {
  // Case 2: Literal with Incremental Indexing
  const encCtx = new HpackContext({ useHuffman: false });
  const decCtx = new HpackContext({ useHuffman: false });

  // Matching name (:path is static index 4), new value '/custom'
  const step1 = encCtx.encodeHeader(':path', '/custom', { preferredCase: 2, useHuffman: false });
  assert.equal(step1.caseNumber, 2);
  // First byte: 01000100 = 0x44 (0x40 | 4)
  assert.equal(step1.bytes[0], 0x44);

  const decStep1 = decCtx.decode(step1.bytes);
  assert.equal(decStep1.headers[0].name, ':path');
  assert.equal(decStep1.headers[0].value, '/custom');
  // Should have been added to dynamic table at index 62 in both encoder and decoder!
  assert.equal(encCtx.dynamicTable.entries.length, 1);
  assert.equal(decCtx.dynamicTable.entries.length, 1);
  assert.equal(encCtx.dynamicTable.get(62).name, ':path');
  assert.equal(encCtx.dynamicTable.get(62).value, '/custom');

  // Case 3: Literal without Indexing
  // New name 'x-custom', new value 'secret'
  const step2 = encCtx.encodeHeader('x-custom', 'secret', { preferredCase: 3, useHuffman: false });
  assert.equal(step2.caseNumber, 3);
  // First byte: 00000000 = 0x00
  assert.equal(step2.bytes[0], 0x00);

  const decStep2 = decCtx.decode(step2.bytes);
  assert.equal(decStep2.headers[0].name, 'x-custom');
  assert.equal(decStep2.headers[0].value, 'secret');
  // Dynamic table count should remain 1 because Case 3 does NOT index
  assert.equal(encCtx.dynamicTable.entries.length, 1);
  assert.equal(decCtx.dynamicTable.entries.length, 1);
});

test('5. Dynamic table adds from 62 and shifts / evicts oldest when full', () => {
  // Max table size 100 bytes (each entry overhead is 32 bytes)
  // Entry 1: 'a'='b' -> 1 + 1 + 32 = 34 bytes
  // Entry 2: 'c'='d' -> 34 bytes (total 68 bytes)
  // Entry 3: 'e'='f' -> 34 bytes (total 102 > 100 -> evicts Entry 1!)
  const dt = new DynamicTable(100);

  const r1 = dt.add('a', 'b');
  assert.equal(r1.evicted.length, 0);
  assert.equal(dt.entries.length, 1);
  assert.equal(dt.get(62).name, 'a');

  const r2 = dt.add('c', 'd');
  assert.equal(r2.evicted.length, 0);
  assert.equal(dt.entries.length, 2);
  assert.equal(dt.get(62).name, 'c');
  assert.equal(dt.get(63).name, 'a');

  const r3 = dt.add('e', 'f');
  assert.equal(r3.evicted.length, 1);
  assert.equal(r3.evicted[0].name, 'a'); // Oldest evicted!
  assert.equal(dt.entries.length, 2);
  assert.equal(dt.get(62).name, 'e');
  assert.equal(dt.get(63).name, 'c');
  assert.equal(dt.get(64), null);
});

test('6. Sequential requests: Dynamic table entry referenced via Case 1 in next request', () => {
  const encCtx = new HpackContext();
  const decCtx = new HpackContext();

  // Request 1: sends custom-header: custom-value (Case 2: saves to dynamic table)
  const req1 = encCtx.encode([{ name: 'custom-header', value: 'alpha' }], { preferredCase: 2 });
  assert.equal(req1.steps[0].caseNumber, 2);
  decCtx.decode(req1.bytes);

  // Both should have index 62 = custom-header: alpha
  assert.equal(encCtx.dynamicTable.get(62).name, 'custom-header');
  assert.equal(decCtx.dynamicTable.get(62).name, 'custom-header');

  // Request 2: sends the SAME header custom-header: alpha!
  // It should now match dynamically and be encoded as CASE 1 (Indexed, index 62)!
  const req2 = encCtx.encode([{ name: 'custom-header', value: 'alpha' }]);
  assert.equal(req2.steps[0].caseNumber, 1);
  assert.equal(req2.steps[0].bytes[0], 0x80 | 62); // 10111110 = 0xbe

  const decReq2 = decCtx.decode(req2.bytes);
  assert.equal(decReq2.headers[0].name, 'custom-header');
  assert.equal(decReq2.headers[0].value, 'alpha');
  assert.equal(decReq2.headers[0].caseNumber, 1);
});

test('7. Huffman Coding encode and decode roundtrip', () => {
  const testStrings = [
    'www.example.com',
    '/sample/path',
    'image/jpeg',
    'Mon, 21 Oct 2013 20:13:21 GMT',
    'gzip, deflate, br',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  ];

  for (const str of testStrings) {
    const rawLen = Buffer.byteLength(str);
    const encoded = encodeHuffman(str);
    const decoded = decodeHuffman(encoded);
    assert.equal(decoded, str, `Huffman roundtrip failed for "${str}"`);
    // Huffman usually achieves reduction on ASCII text
    assert.ok(encoded.length <= rawLen + 1);
  }
});

test('8. Full HPACK Request with mixed Case 1, Case 2 with Huffman ON and OFF', () => {
  const encPlain = new HpackContext({ useHuffman: false });
  const encHuffman = new HpackContext({ useHuffman: true });

  const headers = [
    { name: ':method', value: 'GET' },
    { name: ':path', value: '/products/electronics/phones' },
    { name: 'user-agent', value: 'curl/7.68.0' },
    { name: 'accept', value: 'application/json' }
  ];

  const plainRes = encPlain.encode(headers);
  const huffmanRes = encHuffman.encode(headers);

  // Both should decode back to original
  const decPlain = new HpackContext({ useHuffman: false });
  const decodedPlain = decPlain.decode(plainRes.bytes);
  assert.deepEqual(
    decodedPlain.headers.map(h => ({ name: h.name, value: h.value })),
    headers
  );

  const decHuffman = new HpackContext({ useHuffman: true });
  const decodedHuffman = decHuffman.decode(huffmanRes.bytes);
  assert.deepEqual(
    decodedHuffman.headers.map(h => ({ name: h.name, value: h.value })),
    headers
  );

  // Huffman wire size should be smaller than plain wire size
  assert.ok(huffmanRes.totalBytes < plainRes.totalBytes);
  console.log(`Plain size: ${plainRes.totalBytes} bytes | Huffman size: ${huffmanRes.totalBytes} bytes | Saved: ${plainRes.totalBytes - huffmanRes.totalBytes} bytes`);
});
