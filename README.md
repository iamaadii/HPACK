<div align="center">

# ⚡ HPACK Explorer
Interactive HTTP/2 Header Compression (RFC 7541) Engine & Bit-Level Visualizer.

[Demo](#demo) • [What is this?](#what-is-this) • [Features](#features) • [Tech Stack](#tech-stack) • [Architecture](#architecture) • [Getting Started](#getting-started) • [Usage](#usage)

</div>

<br>

## Demo
![alt text](screencapture-localhost-3000-2026-09-22-15_50_13.png)
<br>

## What is this?
Whenever you browse the web, your browser transmits repetitive HTTP headers like `User-Agent`, `Cookie`, and `:method` on every single click. In HTTP/1.1, these were sent as redundant plain text strings, wasting network bandwidth. **HPACK (RFC 7541)** is the binary compression algorithm behind HTTP/2 that collapses these repeated headers into compact, single-byte index lookups and Huffman bitstreams, eliminating up to 85%+ of header network overhead.

<br>

## Features
✅ **Zero-Dependency RFC 7541 Implementation:** Native JavaScript codecs for variable-length integers (Section 5.1), static/dynamic dictionaries, and canonical Huffman coding (Appendix B).  
✅ **Interactive Bit-Level Visualizer:** Color-coded binary breakdowns highlighting prefix bits, table indices, string lengths, and the Huffman `H-bit`.  
✅ **Stateful Dynamic Dictionary (Index 62+):** Real-time tracking of learned headers with bounded 4096-byte memory limits and automated FIFO eviction using RFC overhead rules (`name + value + 32 bytes`).  
✅ **Dual Engine Execution:** Runs entirely client-side in the browser for zero-latency, offline inspection, and is backed by a Node.js Express REST API (`/api/encode`, `/api/decode`).  
✅ **Automated RFC Test Suite:** 8 test suites validating official RFC 7541 Appendix C test vectors and 100% lossless roundtrip decoding.

<br>

## Tech Stack
| Layer | Tech |
| :--- | :--- |
| **Backend** | Node.js (ES Modules), Express.js |
| **Frontend** | Vanilla JavaScript (ES6+), Modern HTML5, Custom CSS3 (Dark Glassmorphic UI) |
| **Protocol / Standard** | HTTP/2 HPACK (RFC 7541) |
| **Algorithms** | Canonical Huffman Prefix Tree, Variable-Length Integer Codec, Sliding-Window FIFO Eviction |
| **Testing** | Node.js Built-in Test Runner (`node:test`) |

<br>

## Architecture

```
                                  ┌──> [Case 1: Exact Match] ────────> Emit 1-byte index (0x80 | idx)
                                  │
Header Input ──> Lookup Table ───┼──> [Case 2: New/Modified Header] ─> Emit literal + Save to Index 62
                                  │
                                  └──> [Case 3: Ephemeral/Sensitive] ─> Emit literal, do NOT index
                                                  │
                                                  ▼
                                       [Huffman Encoder (H-Bit)]
                                                  │
                                                  ▼
                                       [Lossless HPACK Decoder]
                                                  │
                                                  ▼
                                  [Interactive Bit & Stats UI]
```

When headers are submitted, the engine parses each key-value pair and scans the **Static Table** (indices 1–61) followed by the **Dynamic Table** (indices 62+). If an exact match is found (**Case 1**), it emits a 1-byte wire index; if new, it encodes the field and registers it to index 62 in the Dynamic Table (**Case 2**); sensitive or one-off headers bypass indexing (**Case 3**). Literals are optionally packed via the 257-symbol canonical Huffman tree, assembled into raw wire bytes, and piped into the decoder to confirm 100% lossless roundtrip fidelity before rendering real-time bit breakdowns.

<br>

## What's implemented
- [x] **Case 1 — Indexed Header Field** (`0x80 | index`)
- [x] **Case 2 — Literal with Incremental Indexing (Indexed Name)** (`0x40 | index`)
- [x] **Case 3 — Literal with Incremental Indexing (New Name)** (`0x40 0x00 ...`)
- [x] **Case 3 — Literal without Indexing** (`0x00 ...` ephemeral fields)
- [x] **RFC 7541 Appendix A Static Table** (all 61 standard HTTP/2 predefined headers)
- [x] **Bounded Dynamic Table** (FIFO eviction, size calculation with 32-byte overhead per entry)
- [x] **Canonical Huffman Coding** (Appendix B 257-symbol binary prefix tree, EOS padding alignment)
- [x] **Variable-Length Integer Codec** (Section 5.1 arbitrary prefix bit packing & continuation bytes)
- [ ] **Case 4 — Dynamic Table Size Update** (`0x20 | max-size`, noted as future work)
- [ ] **Never-Indexed Literal Representation** (`0x10 | index`, sensitive credential flag, noted as future work)

<br>

## Getting Started

### Prerequisites
- **Node.js v18+** installed on your system.

### Installation
```bash
git clone https://github.com/iamaadii/HPACK.git
cd HPACK
npm install
```

### Run locally
```bash
npm start
```
Visit **`http://localhost:3000`** in your browser.

### Run Tests
```bash
npm test
```

<br>

## Usage

```javascript
import { HpackContext } from './lib/hpack.js';

// Initialize context with Huffman compression enabled
const encoder = new HpackContext({ useHuffman: true });
const decoder = new HpackContext({ useHuffman: true });

// 1. Encode headers
const headers = [
  { name: ':method', value: 'GET' },
  { name: ':scheme', value: 'https' },
  { name: ':path', value: '/index.html' },
  { name: ':authority', value: 'example.com' }
];

const encoded = encoder.encode(headers);
console.log('Hex wire format:', encoded.hex);
console.log('Total bytes:', encoded.totalBytes);

// 2. Decode wire bytes losslessly
const decoded = decoder.decode(encoded.bytes);
console.log('Reconstructed headers:', decoded.headers);
```

<br>

## Benchmarks (Compression Efficiency)
| Scenario | HTTP/1.1 Raw Size | HPACK Wire Size | Reduction |
| :--- | :--- | :--- | :--- |
| **Initial Request (Cold Dynamic Table)** | 103 Bytes | 27 Bytes | **73.8%** |
| **Subsequent Request (Dynamic Table Hit)** | 103 Bytes | 5 Bytes | **95.1%** |
| **Sequential Stream (High Repetition)** | 1,240 Bytes | 186 Bytes | **85.0%** |

<br>

## Folder Structure
```text
HPACK/
├── lib/
│   ├── dynamicTable.js     # Learning dictionary, LRU/FIFO eviction & size tracking
│   ├── hpack.js            # Core encoder/decoder orchestrator & case decider
│   ├── huffmanCodec.js     # Canonical Huffman binary tree encoder & decoder
│   ├── huffmanTable.js     # 257 canonical Huffman symbol definitions (RFC 7541)
│   ├── integerCodec.js     # Variable-length N-bit prefix integer packer/unpacker
│   └── staticTable.js      # 61 predefined HTTP/2 static header entries
├── public/
│   ├── app.js              # In-browser HPACK engine, interactive UI & live visualizer
│   ├── index.html          # Clean structure, preset selector & bit breakdown cards
│   └── style.css           # Glassmorphic dark theme & responsive layout
├── tests/
│   └── hpack.test.js       # 8 automated test suites verifying RFC 7541 compliance
├── PROJECT_GUIDE.md        # Comprehensive concept & architectural guide
├── server.js               # Express server and stateless /api endpoints
├── package.json
└── README.md
```

<br>

## What I learned / Challenges
Implementing arbitrary bitwise operations in JavaScript without native 64-bit integer bit-shifting issues was a major takeaway, especially streaming bits across byte boundaries during Huffman encoding. Another critical challenge was implementing the exact RFC 7541 Dynamic Table sliding window—computing entry overhead (`name.length + value.length + 32 bytes`) and keeping indices dynamically synchronized across encoder and decoder states during FIFO evictions.

<br>

## Future Improvements
- [ ] Implement Case 4 (Dynamic Table Size Update signaling)
- [ ] Implement Never-Indexed Literal representation (`0x10 | index`) for sensitive headers
- [ ] Add interactive HTTP/2 frame multiplexing simulation
