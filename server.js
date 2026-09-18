const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
// Gunakan path dari environment variable jika ada (untuk Railway Volume), jika tidak pakai default
const DB_FILE = process.env.DATA_PATH || path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Load frontend dari folder public

// Inisialisasi database JSON sederhana
const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ places: [] }));
}

function getPlaces() {
    try {
        const data = fs.readFileSync(DB_FILE);
        return JSON.parse(data).places;
    } catch (e) {
        return [];
    }
}

function savePlaces(places) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ places }, null, 2));
}

// 1. API untuk Roblox mengecek lisensi (Wajib pakai POST)
app.post('/api/check', (req, res) => {
    const { placeId } = req.body;
    const places = getPlaces();
    
    // Cek apakah placeId ada di list (konversi ke string agar aman dari beda tipe data)
    if (places.map(String).includes(String(placeId))) {
        return res.json({ isLicensed: true });
    }
    return res.json({ isLicensed: false });
});

// 2. API untuk Frontend mendapatkan List Place
app.get('/api/places', (req, res) => {
    res.json(getPlaces());
});

// 3. API untuk Frontend menambah Place (ACC)
app.post('/api/places', (req, res) => {
    const { placeId } = req.body;
    if (!placeId) return res.status(400).json({ error: "Place ID kosong" });
    
    const places = getPlaces();
    if (!places.map(String).includes(String(placeId))) {
        places.push(String(placeId));
        savePlaces(places);
    }
    res.json({ success: true, places });
});

// 4. API untuk menghapus Place dari List
app.delete('/api/places/:id', (req, res) => {
    const id = req.params.id;
    let places = getPlaces();
    places = places.filter(p => p !== id);
    savePlaces(places);
    res.json({ success: true, places });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server MCHLERN Lisensi berjalan di port ${PORT}`);
});
