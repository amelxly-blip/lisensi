const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================================================
// PENTING: DATA_PATH harus di-set ke path Railway Volume
// Contoh di Railway: DATA_PATH=/data/mchlern.json
// Volume harus di-mount di /data
// ==============================================================
const DB_FILE = process.env.DATA_PATH || path.join(__dirname, 'data.json');

console.log(`[MCHLERN] DB file path: ${DB_FILE}`);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Pastikan folder parent ada (penting untuk Railway Volume yang kosong)
function ensureDbFile() {
    const dbDir = path.dirname(DB_FILE);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`[MCHLERN] Folder dibuat: ${dbDir}`);
    }
    if (!fs.existsSync(DB_FILE)) {
        const empty = JSON.stringify({ places: [], scanned: [], blacklisted: [] }, null, 2);
        fs.writeFileSync(DB_FILE, empty);
        console.log(`[MCHLERN] File DB baru dibuat: ${DB_FILE}`);
    } else {
        console.log(`[MCHLERN] File DB ditemukan, data aman.`);
    }
}

ensureDbFile();

function getData() {
    try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.places)) parsed.places = [];
        if (!Array.isArray(parsed.scanned)) parsed.scanned = [];
        if (!Array.isArray(parsed.blacklisted)) parsed.blacklisted = [];
        return parsed;
    } catch (e) {
        console.error(`[MCHLERN] Error baca DB: ${e.message}. Reset ke kosong.`);
        return { places: [], scanned: [], blacklisted: [] };
    }
}

function saveData(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(`[MCHLERN] GAGAL SIMPAN DATA: ${e.message}`);
        console.error(`[MCHLERN] Cek apakah Railway Volume sudah di-mount!`);
    }
}

// ===================== Health Check =====================
app.get('/api/status', (req, res) => {
    const data = getData();
    res.json({
        status: 'OK',
        db_file: DB_FILE,
        db_exists: fs.existsSync(DB_FILE),
        places_count: data.places.length,
        scanned_count: data.scanned.length,
        blacklisted_count: data.blacklisted.length
    });
});

// ===================== API CEK LISENSI (Roblox) =====================
app.post('/api/check', (req, res) => {
    const { placeId } = req.body;
    if (!placeId) return res.json({ isLicensed: false });

    const data = getData();
    const strId = String(placeId);

    // Cek jika di-ACC
    if (data.places.map(String).includes(strId)) {
        return res.json({ isLicensed: true });
    }

    // Auto Scan: catat jika belum di-blacklist dan belum tercatat
    if (!data.blacklisted.map(String).includes(strId) && !data.scanned.map(String).includes(strId)) {
        data.scanned.push(strId);
        saveData(data);
    }

    return res.json({ isLicensed: false });
});

// ===================== API PLACES (ACC) =====================
app.get('/api/places', (req, res) => res.json(getData().places));
app.post('/api/places', (req, res) => {
    const { placeId } = req.body;
    if (!placeId) return res.status(400).json({ error: "Place ID kosong" });

    const data = getData();
    const strId = String(placeId).trim();

    if (!data.places.map(String).includes(strId)) data.places.push(strId);

    // Hapus dari scan & blacklist jika di-ACC
    data.scanned = data.scanned.filter(p => String(p) !== strId);
    data.blacklisted = data.blacklisted.filter(p => String(p) !== strId);

    saveData(data);
    res.json({ success: true, places: data.places });
});
app.delete('/api/places/:id', (req, res) => {
    const data = getData();
    data.places = data.places.filter(p => String(p) !== String(req.params.id));
    saveData(data);
    res.json({ success: true });
});

// ===================== API SCANNED (LOG PENCURIAN) =====================
app.get('/api/scanned', (req, res) => res.json(getData().scanned));
app.delete('/api/scanned/:id', (req, res) => {
    const data = getData();
    data.scanned = data.scanned.filter(p => String(p) !== String(req.params.id));
    saveData(data);
    res.json({ success: true });
});

// ===================== API BLACKLIST =====================
app.get('/api/blacklist', (req, res) => res.json(getData().blacklisted));
app.post('/api/blacklist', (req, res) => {
    const { placeId } = req.body;
    if (!placeId) return res.status(400).json({ error: "Place ID kosong" });
    const data = getData();
    const strId = String(placeId).trim();

    if (!data.blacklisted.map(String).includes(strId)) data.blacklisted.push(strId);

    // Hapus dari scan & places
    data.scanned = data.scanned.filter(p => String(p) !== strId);
    data.places = data.places.filter(p => String(p) !== strId);

    saveData(data);
    res.json({ success: true });
});
app.delete('/api/blacklist/:id', (req, res) => {
    const data = getData();
    data.blacklisted = data.blacklisted.filter(p => String(p) !== String(req.params.id));
    saveData(data);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`[MCHLERN] Server berjalan di port ${PORT}`);
    console.log(`[MCHLERN] Cek status: /api/status`);
});
