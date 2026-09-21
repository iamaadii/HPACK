import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { STATIC_TABLE } from './lib/staticTable.js';
import { HpackContext } from './lib/hpack.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create server session contexts if needed or provide stateless encode/decode APIs
app.get('/api/static-table', (req, res) => {
  res.json({
    table: STATIC_TABLE.slice(1).map((entry, idx) => ({
      index: idx + 1,
      name: entry.name,
      value: entry.value
    }))
  });
});

app.post('/api/encode', (req, res) => {
  try {
    const { headers, options, dynamicTableEntries } = req.body;
    const ctx = new HpackContext(options || {});
    
    // If client supplied existing dynamic table state to reconstruct:
    if (Array.isArray(dynamicTableEntries)) {
      // Reconstruct dynamic table (entries are in order of index 62, 63...)
      for (let i = dynamicTableEntries.length - 1; i >= 0; i--) {
        ctx.dynamicTable.entries.push({
          name: dynamicTableEntries[i].name,
          value: dynamicTableEntries[i].value,
          size: dynamicTableEntries[i].size || (Buffer.byteLength(dynamicTableEntries[i].name) + Buffer.byteLength(dynamicTableEntries[i].value) + 32),
          addedAt: Date.now()
        });
      }
      ctx.dynamicTable.currentSize = ctx.dynamicTable.entries.reduce((acc, e) => acc + e.size, 0);
    }

    const encodeResult = ctx.encode(headers || [], options || {});
    const dynamicTableSnapshot = ctx.dynamicTable.getEntries();

    res.json({
      success: true,
      ...encodeResult,
      dynamicTable: dynamicTableSnapshot
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/decode', (req, res) => {
  try {
    const { bytes, dynamicTableEntries } = req.body;
    const ctx = new HpackContext();

    if (Array.isArray(dynamicTableEntries)) {
      for (let i = dynamicTableEntries.length - 1; i >= 0; i--) {
        ctx.dynamicTable.entries.push({
          name: dynamicTableEntries[i].name,
          value: dynamicTableEntries[i].value,
          size: dynamicTableEntries[i].size,
          addedAt: Date.now()
        });
      }
      ctx.dynamicTable.currentSize = ctx.dynamicTable.entries.reduce((acc, e) => acc + e.size, 0);
    }

    const byteArr = Array.isArray(bytes) ? bytes : Array.from(Buffer.from(bytes, 'hex'));
    const result = ctx.decode(byteArr);

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`HPACK Explorer running at http://localhost:${PORT}`);
});
