/**
 * RFC 7541 Section 5.1 - Integer Representation
 */

/**
 * Encodes an integer with an N-bit prefix into an array of byte numbers.
 * @param {number} value The non-negative integer to encode
 * @param {number} prefixBits The prefix size N (1 to 8)
 * @param {number} prefixMask Optional bits to set in the upper (8 - N) bits of first octet
 * @returns {number[]} Array of bytes (numbers 0-255)
 */
export function encodeInteger(value, prefixBits, prefixMask = 0) {
  if (value < 0) {
    throw new Error('Integer value cannot be negative');
  }
  const maxPrefixVal = (1 << prefixBits) - 1;
  const bytes = [];

  if (value < maxPrefixVal) {
    bytes.push(prefixMask | value);
    return bytes;
  }

  // Prefix filled with all 1s
  bytes.push(prefixMask | maxPrefixVal);
  let remaining = value - maxPrefixVal;

  while (remaining >= 128) {
    bytes.push((remaining % 128) | 0x80);
    remaining = Math.floor(remaining / 128);
  }
  bytes.push(remaining);

  return bytes;
}

/**
 * Decodes an integer with an N-bit prefix from a byte buffer.
 * @param {Uint8Array|number[]} buffer The input buffer
 * @param {number} offset Starting byte offset
 * @param {number} prefixBits The prefix size N (1 to 8)
 * @returns {{ value: number, bytesRead: number }}
 */
export function decodeInteger(buffer, offset, prefixBits) {
  if (offset >= buffer.length) {
    throw new Error('Unexpected end of buffer while decoding integer');
  }

  const maxPrefixVal = (1 << prefixBits) - 1;
  const firstByte = buffer[offset];
  let value = firstByte & maxPrefixVal;
  let bytesRead = 1;

  if (value < maxPrefixVal) {
    return { value, bytesRead };
  }

  let m = 0;
  while (true) {
    if (offset + bytesRead >= buffer.length) {
      throw new Error('Buffer truncated while decoding multi-byte integer');
    }
    const b = buffer[offset + bytesRead];
    bytesRead++;
    value += (b & 127) * Math.pow(2, m);
    m += 7;
    if ((b & 128) === 0) {
      break;
    }
  }

  return { value, bytesRead };
}
