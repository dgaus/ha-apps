import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'swim_db.json');
const OPTIONS_FILE = path.join(DATA_DIR, 'options.json'); // written by Home Assistant

// Weekday names (as used in the HA add-on options) -> weekday index (0 = Sunday).
// Sunday is intentionally absent: its display index depends on week_starts_on.
const DAY_NAME_TO_INDEX = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
};

// Canonical config. Schedule keys are *display indices* 0-7 (Sunday = 7 here, so it renders
// last by default). Used as-is when no HA options file is present (e.g. local `npm run dev`).
const DEFAULT_CONFIG = {
    schedule: {
        1: { open: "08:00", close: "22:00" },
        2: { open: "08:00", close: "22:00" },
        3: { open: "08:00", close: "22:00" },
        4: { open: "08:00", close: "22:00" },
        5: { open: "08:00", close: "22:00" },
        6: { open: "09:00", close: "20:00" },
        7: { open: "09:00", close: "17:00" }
    },
    slotDurationMinutes: 30
};

// Translate the HA options shape (day-name keys, week_starts_on, slot_duration_minutes) into the
// canonical config the frontend consumes. Sunday lands at display index 0 (renders first) or 7
// (renders last) depending on week_starts_on; everything maps back to a weekday via `index % 7`.
function normalizeConfig(raw) {
    if (!raw || typeof raw !== 'object' || !raw.schedule) return DEFAULT_CONFIG;

    const sundayIndex = raw.week_starts_on === 'sunday' ? 0 : 7;
    const schedule = {};

    for (const [name, val] of Object.entries(raw.schedule)) {
        if (!val || !val.open || !val.close) continue; // closed day -> no slots
        const key = name.toLowerCase();
        const index = key === 'sunday' ? sundayIndex : DAY_NAME_TO_INDEX[key];
        if (index === undefined) continue; // unknown day name
        schedule[index] = { open: val.open, close: val.close };
    }

    if (Object.keys(schedule).length === 0) return DEFAULT_CONFIG;

    const slot = raw.slot_duration_minutes ?? raw.slotDurationMinutes;
    return {
        schedule,
        slotDurationMinutes: Number(slot) || DEFAULT_CONFIG.slotDurationMinutes
    };
}

// Read the HA options file if present; fall back to defaults on missing/empty/corrupt.
async function loadConfig() {
    try {
        const content = await fs.readFile(OPTIONS_FILE, 'utf-8');
        if (!content.trim()) return DEFAULT_CONFIG;
        return normalizeConfig(JSON.parse(content));
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.warn('Could not read options.json, using default config:', err.message);
        }
        return DEFAULT_CONFIG;
    }
}

app.use(cors());
app.use(express.json({ limit: '5mb' })); // a full export can exceed the 100kb default

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// Ensure data directory exists
async function initDB() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        // Check if file exists and is valid
        try {
            await fs.access(DB_FILE);
            const content = await fs.readFile(DB_FILE, 'utf-8');
            // Validate it's valid JSON
            if (!content.trim()) {
                console.log('DB file is empty, initializing with empty array');
                await fs.writeFile(DB_FILE, JSON.stringify([], null, 2));
            } else {
                JSON.parse(content); // Validate JSON
            }
        } catch (err) {
            // File doesn't exist or is invalid JSON
            console.log('DB file missing or invalid, creating new one');
            await fs.writeFile(DB_FILE, JSON.stringify([], null, 2));
        }
    } catch (err) {
        console.error('Failed to initialize DB:', err);
        process.exit(1);
    }
}

// Helper to safely read records with error recovery
async function safeReadRecords() {
    try {
        const content = await fs.readFile(DB_FILE, 'utf-8');
        if (!content.trim()) {
            // Empty file, return empty array and fix the file
            await fs.writeFile(DB_FILE, JSON.stringify([], null, 2));
            return [];
        }
        return JSON.parse(content);
    } catch (err) {
        if (err.code === 'ENOENT') {
            // File was deleted, recreate it
            console.warn('DB file was deleted, recreating...');
            await fs.mkdir(DATA_DIR, { recursive: true });
            await fs.writeFile(DB_FILE, JSON.stringify([], null, 2));
            return [];
        } else if (err instanceof SyntaxError) {
            // Invalid JSON, backup and recreate
            console.error('DB file contains invalid JSON, backing up and recreating...');
            const backupFile = `${DB_FILE}.backup.${Date.now()}`;
            try {
                await fs.copyFile(DB_FILE, backupFile);
                console.log(`Backed up corrupted file to: ${backupFile}`);
            } catch (backupErr) {
                console.error('Failed to backup corrupted file:', backupErr);
            }
            await fs.writeFile(DB_FILE, JSON.stringify([], null, 2));
            return [];
        }
        throw err;
    }
}

// API Routes
app.get('/api/config', async (req, res) => {
    res.json(await loadConfig());
});

app.get('/api/records', async (req, res) => {
    try {
        const records = await safeReadRecords();
        res.json(records);
    } catch (err) {
        console.error('Error reading records:', err);
        res.status(500).json({ error: 'Failed to read records' });
    }
});

app.post('/api/records', async (req, res) => {
    try {
        const { rating, timestamp, id, day, time } = req.body;
        if (!rating || !timestamp || !id) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        const records = await safeReadRecords();

        const newRecord = { id, rating, timestamp, day, time };
        records.push(newRecord);

        await fs.writeFile(DB_FILE, JSON.stringify(records, null, 2));
        res.json(newRecord);
    } catch (err) {
        console.error('Error saving record:', err);
        res.status(500).json({ error: 'Failed to save record' });
    }
});

// Bulk import: merge incoming records over existing ones by id (idempotent — re-importing the
// same export won't duplicate). Accepts a bare array (what export produces) or { records: [...] }.
app.post('/api/records/import', async (req, res) => {
    try {
        const incoming = Array.isArray(req.body) ? req.body : req.body?.records;
        if (!Array.isArray(incoming)) {
            return res.status(400).json({ error: 'Expected a JSON array of records' });
        }

        const existing = await safeReadRecords();
        const byId = new Map(existing.map(r => [r.id, r]));

        let imported = 0;
        let skipped = 0;
        for (const r of incoming) {
            if (!r || !r.id || !r.rating || !r.timestamp) {
                skipped++;
                continue;
            }
            byId.set(r.id, { id: r.id, rating: r.rating, timestamp: r.timestamp, day: r.day, time: r.time });
            imported++;
        }

        const merged = [...byId.values()];
        await fs.writeFile(DB_FILE, JSON.stringify(merged, null, 2));
        res.json({ imported, skipped, total: merged.length });
    } catch (err) {
        console.error('Error importing records:', err);
        res.status(500).json({ error: 'Failed to import records' });
    }
});

app.delete('/api/records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const records = await safeReadRecords();

        const filteredRecords = records.filter(r => r.id !== id);

        await fs.writeFile(DB_FILE, JSON.stringify(filteredRecords, null, 2));
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting record:', err);
        res.status(500).json({ error: 'Failed to delete record' });
    }
});

// Catch-all for SPA
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

