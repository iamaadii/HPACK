# 📘 Complete Project Guide: HPACK / HTTP/2 Explorer

This guide explains **what this project does**, **how it works**, the **role of every file**, and the **step-by-step flow** using simple, everyday words.

---

## 1. What This Project Does (In Plain English)

Whenever you click a link on the internet, your web browser sends **HTTP headers** (like `User-Agent: Mozilla...`, `:method: GET`, `Cookie: ...`). 

In older HTTP/1.1, these headers were sent as long, repetitive plain text strings on every single click, wasting network bandwidth.

**This project builds a complete, visual HTTP/2 HPACK Engine.**
It allows you to:
1. Type in any HTTP headers you want.
2. See the exact compressed bytes and bits sent over the network.
3. Watch the **Dynamic Dictionary** learn new headers starting at **Index 62**.
4. See repeated headers shrink from dozens of letters down to **a single byte**.
5. Test what happens when you turn **Huffman Compression** ON and OFF.
6. Verify that the **HPACK Decoder** can read the raw bytes back into the exact original headers without losing a single letter.

---

## 2. The Core Ideas

```
                        ┌──> Case 1: Already known? Send 1-byte index!
Header Input ──> Lookup ┤
                        ├──> Case 2: New header? Send text + Save to Index 62 for later!
                        └──> Case 3: Sensitive or one-time? Send once, don't save!
```

1. **Static Table (1 to 61):** A hardcoded list of the 61 most common web headers in the world.
2. **Dynamic Table (62 and up):** An in-memory notebook that learns new headers as they arrive.
3. **FIFO Eviction:** If the Dynamic Table reaches its memory limit, the oldest headers at the bottom are automatically discarded to make room for new ones.
4. **Huffman Coding (RFC 7541 Appendix B):** A pre-shared code tree where common letters take only 5 or 6 bits instead of 8 bits.

---

## 3. The Role of Every File in the Project

Here is what each file in this project does:

```
HPACK/
├── server.js              # The Node.js web server
├── package.json           # Project configuration and scripts
├── README.md              # Quick overview for GitHub
├── PROJECT_GUIDE.md       # This complete guide
├── lib/
│   ├── staticTable.js     # The 61 standard built-in headers
│   ├── integerCodec.js    # Converts index numbers to RFC 7541 variable bits
│   ├── huffmanTable.js    # The 257 canonical Huffman symbol codes
│   ├── huffmanCodec.js    # Encodes/decodes characters into bitstreams
│   ├── dynamicTable.js    # The learning dictionary starting at index 62
│   └── hpack.js          # The brain: connects encoder and decoder
├── public/
│   ├── index.html         # The webpage layout and controls
│   ├── style.css          # Modern dark styling and mobile responsiveness
│   └── app.js            # In-browser engine and interactive screen updates
└── tests/
    └── hpack.test.js      # Automated tests checking math against RFC 7541
```

---

### File Details:

#### 1. `server.js` (The Web Server)
* **What it does:** Starts a lightweight Node.js Express server on port 3000.
* **Role:** Serves the frontend files (`index.html`, `style.css`, `app.js`) to your browser and provides `/api/encode`, `/api/decode`, and `/api/static-table` endpoints.

#### 2. `lib/staticTable.js` (The Built-In Dictionary)
* **What it does:** Contains the 61 standard headers defined in RFC 7541 Appendix A.
* **Role:** When you send `:method: GET`, this file finds that it is **Index #2**, so the encoder knows to send `0x82` instead of spelling out the word.

#### 3. `lib/integerCodec.js` (The Variable-Length Number Packer)
* **What it does:** Implements RFC 7541 Section 5.1 integer representation.
* **Role:** In HPACK, numbers are packed into prefixes of 4, 5, 6, or 7 bits. If a number is too large to fit in those bits, this file splits it across continuation bytes where the top bit indicates whether more bytes follow.

#### 4. `lib/huffmanTable.js` (The 257 Huffman Codes)
* **What it does:** Contains the pre-calculated frequency codes for all 256 ASCII byte values plus the special `EOS` (End-Of-String) symbol #256.
* **Role:** Gives `huffmanCodec.js` the exact bit sequences for each letter.

#### 5. `lib/huffmanCodec.js` (The String Compressor)
* **What it does:** Builds a binary prefix tree in memory to encode and decode character strings.
* **Role:** Converts words like `"www.example.com"` into packed bitstreams. It also handles string literal representations, including the leading **H bit** ($H=1$ for compressed, $H=0$ for plain).

#### 6. `lib/dynamicTable.js` (The Learning Dictionary)
* **What it does:** Manages the dynamic dictionary for a session.
* **Role:**
  - Assigns new headers to **Index 62**.
  - Calculates memory size using the RFC formula: `name.length + value.length + 32 bytes`.
  - Shifts older entries to higher numbers (#63, #64...).
  - Drops the oldest entries when table capacity (e.g. 4096 bytes) is exceeded (**FIFO Eviction**).

#### 7. `lib/hpack.js` (The Unified Brain)
* **What it does:** Glues the static table, dynamic table, integer codec, and Huffman codec together.
* **Role:**
  - **Encoder:** Reads headers, chooses Case 1, 2, or 3, packs the bits, and logs explanations.
  - **Decoder:** Reads incoming raw wire bytes, checks the leading bits, extracts the headers, and keeps the decoder's dynamic table synchronized with the encoder.

#### 8. `public/index.html` (The User Interface)
* **What it does:** The visual HTML structure.
* **Role:** Contains the header input textarea, preset selector, Huffman toggle switch, Dynamic Table viewer, bit breakdown cards, and the Static Table modal.

#### 9. `public/style.css` (The Visual Design)
* **What it does:** Modern dark glassmorphic design system.
* **Role:**
  - Gives glowing colors to each case (Green for Case 1, Blue for Case 2, Amber for Case 3).
  - Styles individual bits into color-coded pill boxes.
  - Contains media queries so the app looks great on desktop, tablets, and smartphones.

#### 10. `public/app.js` (The In-Browser Controller)
* **What it does:** Runs the interactive UI and contains a standalone client-side HPACK engine.
* **Role:**
  - Listens for button clicks.
  - Runs encoding with zero network latency.
  - Updates the stats ribbon (Raw size, HPACK size, Bytes saved).
  - Pipes encoded bytes directly into the decoder to prove 100% roundtrip correctness on screen.

#### 11. `tests/hpack.test.js` (The Test Suite)
* **What it does:** 8 automated test suites using Node.js built-in test runner.
* **Role:** Verifies all RFC 7541 Appendix C test vectors, integer boundary cases, table shifting, eviction, and roundtrip decoder integrity.

---

## 4. The Step-by-Step Data Flow

Here is what happens inside the program from the moment you click **"Encode & Send Headers"**:

```
 [ 1. User clicks "Encode" ]
             │
             ▼
 [ 2. Parse Headers ] ──────────> Splits text into pairs:
             │                   e.g. name = ":authority", value = "www.example.com"
             ▼
 [ 3. Dictionary Lookup ] ──────> Checks Static Table (1-61) and Dynamic Table (62+)
             │
             ▼
 [ 4. Decide Case ]
      ├── Case 1: Exact match found? ─────────────> Output 1-byte index (0x80 | index)
      ├── Case 2: New/changed? ───────────────────> Output name index + value literal,
      │                                             AND save entry to Dynamic Table at #62
      └── Case 3: Ephemeral? ─────────────────────> Output name index + value literal,
                                                    do NOT save to Dynamic Table
             │
             ▼
 [ 5. Huffman Check ]
      ├── If ON:  Pack characters using Appendix B tree (H bit = 1)
      └── If OFF: Pack characters as raw 8-bit ASCII (H bit = 0)
             │
             ▼
 [ 6. Byte Stream Assembled ] ──> Generates raw hex (e.g. 0x82878541...)
             │
             ▼
 [ 7. Lossless Decoder Test ] ──> Passes bytes into Decoder:
             │                   Reconstructs headers and confirms 100% match
             ▼
 [ 8. Screen Updates ]
      ├── Stats Ribbon: Calculates bytes saved & compression percentage
      ├── Bit Visualizer: Draws color-coded bit cards (Prefix, Index, H-bit, Data)
      └── Dynamic Table: Adds new rows at Index 62 and updates the capacity gauge
```

---

## 5. An Example Walkthrough (See It in Action)

### Request 1: Visiting a website for the first time
You enter:
```http
:method: GET
:scheme: https
:path: /index.html
:authority: www.example.com
user-agent: Mozilla/5.0
```

1. `:method: GET` $\rightarrow$ Matches Static Index #2 $\rightarrow$ **Case 1** $\rightarrow$ **`0x82` (1 byte)**.
2. `:scheme: https` $\rightarrow$ Matches Static Index #7 $\rightarrow$ **Case 1** $\rightarrow$ **`0x87` (1 byte)**.
3. `:path: /index.html` $\rightarrow$ Matches Static Index #5 $\rightarrow$ **Case 1** $\rightarrow$ **`0x85` (1 byte)**.
4. `:authority: www.example.com` $\rightarrow$ New text $\rightarrow$ **Case 2** $\rightarrow$ Saves to **Index 62** in the table!
5. `user-agent: Mozilla/5.0` $\rightarrow$ New text $\rightarrow$ **Case 2** $\rightarrow$ Saves to **Index 62** (pushes `:authority` to **#63**)!

**Total size:** Shrinks from 103 bytes down to **27 bytes**.

---

### Request 2: Clicking an image on the same page
Now you send a second request with the same domain and user-agent:
```http
:method: GET
:scheme: https
:path: /logo.png
:authority: www.example.com
user-agent: Mozilla/5.0
```

1. `:authority: www.example.com` was saved in Request 1!
   - It is already at **Index 63**!
   - It now uses **Case 1**!
   - HPACK sends **`0xBF` (1 single byte)** instead of 26 letters!
2. `user-agent: Mozilla/5.0` was saved in Request 1!
   - It is already at **Index 62**!
   - It now uses **Case 1**!
   - HPACK sends **`0xBE` (1 single byte)** instead of 20 letters!

**Result:** Repeated headers cost **almost zero network bandwidth**.

---

## 6. Commands Quick Reference

| Command | What it does |
| :--- | :--- |
| `npm install` | Installs Express dependencies |
| `npm start` | Starts the server at `http://localhost:3000` |
| `npm test` | Runs the 8 RFC 7541 test suites |
| `node --check public/app.js` | Validates JavaScript syntax |
