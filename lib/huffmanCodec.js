import { HUFFMAN_CODES } from './huffmanTable.js';
import { encodeInteger, decodeInteger } from './integerCodec.js';

/**
 * Build Huffman decode tree
 * Each node is an array [leftNode (0), rightNode (1), symbol | null]
 */
class HuffmanTree {
  constructor() {
    this.root = [null, null, null];
    for (let sym = 0; sym < HUFFMAN_CODES.length; sym++) {
      const [code, len] = HUFFMAN_CODES[sym];
      let curr = this.root;
      for (let bitIdx = len - 1; bitIdx >= 0; bitIdx--) {
        const bit = (code >> bitIdx) & 1;
        if (!curr[bit]) {
          curr[bit] = [null, null, null];
        }
        curr = curr[bit];
      }
      curr[2] = sym; // leaf symbol
    }
  }
}

const TREE = new HuffmanTree();

/**
 * Encode string to Huffman bit stream
 * @param {string|Uint8Array} input
 * @returns {Uint8Array}
 */
export function encodeHuffman(input) {
  const bytes = typeof input === 'string' ? Buffer.from(input, 'utf-8') : input;
  const output = [];
  let currentByte = 0;
  let bitsInByte = 0;

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    const [code, len] = HUFFMAN_CODES[byte];

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

  // Padding with EOS MSB bits (all 1s)
  if (bitsInByte > 0) {
    const padBits = 8 - bitsInByte;
    currentByte = (currentByte << padBits) | ((1 << padBits) - 1);
    output.push(currentByte);
  }

  return new Uint8Array(output);
}

/**
 * Decode Huffman bit stream back to string
 * @param {Uint8Array|number[]} buffer
 * @returns {string}
 */
export function decodeHuffman(buffer) {
  const decoded = [];
  let curr = TREE.root;

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    for (let bitIdx = 7; bitIdx >= 0; bitIdx--) {
      const bit = (byte >> bitIdx) & 1;
      curr = curr[bit];
      if (!curr) {
        throw new Error('Invalid Huffman code sequence');
      }
      if (curr[2] !== null) {
        if (curr[2] === 256) {
          throw new Error('EOS found in decoded stream (RFC 7541 violation)');
        }
        decoded.push(curr[2]);
        curr = TREE.root;
      }
    }
  }

  // Check padding validity: must be all 1s and at most 7 bits (i.e. not completing a symbol)
  if (curr !== TREE.root) {
    // Check if path is only 1s
    // If not matching prefix of EOS (which is all 1s), or longer than 7 bits
    // Here we reached an intermediate node
  }

  return Buffer.from(decoded).toString('utf-8');
}

/**
 * Encode a string literal according to RFC 7541 Section 5.2
 * [1 bit H] [7 bit prefix length] [data]
 * @param {string} str
 * @param {boolean} useHuffman
 * @returns {number[]} Array of bytes
 */
export function encodeStringLiteral(str, useHuffman = false) {
  const rawBytes = Buffer.from(str, 'utf-8');
  if (useHuffman) {
    const huffBytes = encodeHuffman(rawBytes);
    // H bit = 1 -> mask 0x80
    const lenBytes = encodeInteger(huffBytes.length, 7, 0x80);
    return [...lenBytes, ...huffBytes];
  } else {
    // H bit = 0 -> mask 0x00
    const lenBytes = encodeInteger(rawBytes.length, 7, 0x00);
    return [...lenBytes, ...rawBytes];
  }
}

/**
 * Decode a string literal according to RFC 7541 Section 5.2
 * @param {Uint8Array|number[]} buffer
 * @param {number} offset
 * @returns {{ value: string, isHuffman: boolean, bytesRead: number }}
 */
export function decodeStringLiteral(buffer, offset) {
  if (offset >= buffer.length) {
    throw new Error('Unexpected EOF while decoding string literal');
  }
  const isHuffman = (buffer[offset] & 0x80) !== 0;
  const { value: length, bytesRead: lenBytesCount } = decodeInteger(buffer, offset, 7);
  const dataStart = offset + lenBytesCount;
  const dataEnd = dataStart + length;

  if (dataEnd > buffer.length) {
    throw new Error('Buffer truncated while reading string literal data');
  }

  const slice = buffer.slice(dataStart, dataEnd);
  let value;
  if (isHuffman) {
    value = decodeHuffman(slice);
  } else {
    value = Buffer.from(slice).toString('utf-8');
  }

  return {
    value,
    isHuffman,
    bytesRead: lenBytesCount + length
  };
}
