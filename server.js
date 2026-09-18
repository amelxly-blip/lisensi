const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DATA_PATH || path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ places: [], scanned: [], blacklisted: [] }));

function getData() {
    try {
        const parsed = JSON.parse(fs.readFileSync(DB_FILE));
        if (!parsed.scanned) parsed.scanned = [];
        if (!parsed.blacklisted) parsed.blacklisted = [];
        return parsed;
    } catch (e) {
        return { places: [], scanned: [], blacklisted: [] };
    }
}

function saveData(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 1. API Cek Lisensi Roblox
app.post('/api/check', (req, res) => {
    const { placeId } = req.body;
    if (!placeId) return res.json({ isLicensed: false });

    const data = getData();
    const strId = String(placeId);
    
    // Cek jika di-ACC
    if (data.places.map(String).includes(strId)) {
        return res.json({ isLicensed: true });
    }
    
    // Auto Scan: Catat ke Log Pencurian jika belum di-ACC dan belum di-Blacklist
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
    const strId = String(placeId);
    
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
    const data = getData();
    const strId = String(placeId);
    
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
    console.log(`Server MCHLERN Lisensi berjalan di port ${PORT}`);
});
