# ⚡ HPACK / HTTP/2 Explorer

> An interactive, visual tool to see how HTTP/2 turns large, repetitive web headers into tiny single-byte numbers and bits.

![HTTP/2](https://img.shields.io/badge/HTTP%2F2-RFC_7541-6366f1)
![Node.js](https://img.shields.io/badge/Node.js-v20+-10b981)
![Tests](https://img.shields.io/badge/Tests-8%2F8_Passed-06b6d4)
![License](https://img.shields.io/badge/License-MIT-f59e0b)

---

## 💡 What is HPACK? (The Simple Idea)

Imagine you and a friend send notes to each other all day.

Instead of writing out long, repeated sentences like:
> *"I would like to order a large coffee with oat milk"*

You both agree on a **numbered notebook (dictionary)**:
- **#1** = "coffee"
- **#2** = "GET"
- **#3** = "https"

When you want to say that, you just send the number **2**. One tiny number replaces a whole sentence!

That is **HPACK**. It turns long header text into small numbers and bits so websites load much faster.

---

## 🚦 The 3 HPACK Rules (Cases)

Every time you send a header, HPACK picks one of three simple rules:

| Rule | Meaning | Example | Wire Result |
| :--- | :--- | :--- | :--- |
| 🟢 **Case 1: Indexed** | Already in the dictionary! | `:method: GET` is entry #2 | Sends just **1 single byte** (`0x82`). |
| 🔵 **Case 2: Incremental Indexing** | New header—learn it for later! | `:authority: www.example.com` | Sends the letters now, but saves them into **Index 62**. Next time, it only costs **1 byte**! |
| 🟠 **Case 3: Without Indexing** | Send once, don't save. | One-time token or secret password | Sent as text, but **not** stored in memory. |

---

## 📚 The Two Dictionaries (Tables)

### 1. Static Table (Indices 1 to 61)
- Built into every browser and server.
- Contains the 61 most common web headers (like `:method: GET`, `:status: 200`, `content-type`).
- Never changes.

### 2. Dynamic Table (Indices 62 and above)
- Starts empty.
- When new headers arrive with **Case 2**, they get stored starting at **index 62**.
- When new ones are added, older ones move to #63, #64, etc.
- **Removing the oldest (FIFO):** If memory gets full, the oldest header at the bottom gets thrown away to make room for new ones.

---

## 🗜️ Huffman Coding: What Does the Switch Do?

* **Huffman OFF:** Words are sent as normal letters (1 letter = 8 bits = 1 byte).
* **Huffman ON:** Uses the pre-calculated **RFC 7541 Appendix B tree**. Frequent letters (like `e`, `a`, `/`, `0`) shrink down to **5 or 6 bits**, saving an extra **20% to 35%** of bandwidth!

---

## 🌐 Networking Deep Dive: Why is HPACK Needed?

### 1. The HTTP/1.1 Problem: Header Bloat
When your browser opens a modern webpage, it downloads **80 to 150 separate files** (images, CSS styles, JavaScript, API calls).
* In **HTTP/1.1**, every single request re-sent 500 to 2,000 bytes of duplicate text headers (`User-Agent`, `Cookie`, `Authorization`).
* That wasted **100 KB to 200 KB of pure header data** per page view!
* On mobile networks (4G/5G), this caused slow page loads due to **TCP Slow Start** and multiple round-trip delays (RTT).

### 2. Why Not Just Use GZIP? (The CRIME Attack)
In 2012, researchers proved that compressing headers with standard GZIP/Deflate allowed hackers to spy on packet sizes and steal private cookies (**CRIME attack**). 
The IETF designed **HPACK (RFC 7541)** specifically to be fast, table-based, and immune to this attack.

### 3. Where is HPACK Used Today?
- **Web Browsers:** Chrome, Safari, Edge, and Firefox use it on all HTTP/2 traffic.
- **Microservices & gRPC:** Google's gRPC runs over HTTP/2 and uses HPACK to avoid wasting CPU and bandwidth on high-frequency API calls.
- **Edge CDNs:** Cloudflare, AWS CloudFront, and Fastly use HPACK to serve millions of users at the edge.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start the server
```bash
npm start
```

### 3. Open in your browser
Go to: **[http://localhost:3000](http://localhost:3000)**

---

## 🎮 How to Try It Out in the UI

1. **Preset 1 (Initial Request):**
   - Click the preset dropdown and choose **1. Initial Request**.
   - Click **Encode & Send Headers**.
   - Notice that `:method: GET` used **Case 1** (1 byte), and `:authority: www.example.com` used **Case 2** and got saved to **Index 62** in the table on the left.

2. **Preset 2 (Subsequent Request - The "Aha!" moment):**
   - Choose **2. Subsequent Request**.
   - Click **Encode & Send Headers**.
   - Notice that `:authority: www.example.com` is already in Index 62, so it now uses **Case 1** and takes **only 1 single byte (`0xBE`)** instead of 26 bytes!

3. **Check the Bits & Decoder:**
   - Look at the color-coded bits under each header card.
   - Look at the bottom right card to verify that the decoder reconstructed the exact headers with **100% lossless match**.

---

## 🧪 Running the Automated Tests

To run the RFC 7541 unit test suite:

```bash
npm test
```

All 8 test suites will pass:
```text
✔ 1. Static Table has 61 entries and accurate lookups
✔ 2. RFC 7541 Integer Codec - Appendix C.1 Examples
✔ 3. Case 1: Indexed Header Field encode and decode
✔ 4. Cases 2 and 3 with plain text (Huffman OFF)
✔ 5. Dynamic table adds from 62 and shifts / evicts oldest when full
✔ 6. Sequential requests: Dynamic table entry referenced via Case 1 in next request
✔ 7. Huffman Coding encode and decode roundtrip
✔ 8. Full HPACK Request with mixed Case 1, Case 2 with Huffman ON and OFF
```

---

## 📖 Further Reading
For a detailed guide explaining the project structure, how each file works, and the complete data flow, see [PROJECT_GUIDE.md](PROJECT_GUIDE.md).
