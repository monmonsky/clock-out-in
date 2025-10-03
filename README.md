# Sistem Absensi ART

Sistem absensi modern untuk Asisten Rumah Tangga (ART) dengan fitur clock in/out, GPS validation, dan perhitungan gaji otomatis.

## Fitur Utama

### Halaman Clock In/Out (ART)
- ✅ Login dengan PIN 4 digit
- ✅ Clock In/Out dengan validasi GPS (radius 500m)
- ✅ Tampilan waktu real-time
- ✅ Riwayat absensi periode 29-28 setiap bulan
- ✅ Keterangan opsional saat clock in/out
- ✅ Responsive design (mobile & tablet friendly)

### Dashboard Admin
- ✅ Kelola data ART (CRUD)
- ✅ Kelola data absensi (CRUD + edit manual)
- ✅ Kelola data cuti/izin/sakit
- ✅ Laporan gaji otomatis
- ✅ Pengaturan GPS lokasi kantor
- ✅ Pengaturan jam kerja & gaji

### Perhitungan Gaji
- Gaji per hari (8 jam): Rp 100.000
- Lembur (> 8 jam): Rp 11.000/jam
- Hari Minggu: 2x gaji normal
- Cuti/Izin/Sakit: tetap dapat gaji (tidak dipotong)

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Frontend**: HTML + Tailwind CSS + Vanilla JavaScript
- **Authentication**: PIN-based (bcrypt)
- **GPS**: Geolocation API

## Instalasi

### 1. Clone atau Download Repository

```bash
cd clock-in-out
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Create new project atau gunakan existing project
3. Jalankan SQL schema dari file `database/schema.sql` di SQL Editor Supabase
4. Copy URL dan Anon Key dari Settings > API

### 4. Setup Environment Variables

Buat file `.env` di root folder:

```bash
cp .env.example .env
```

Edit file `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
PORT=3000
```

### 5. Jalankan Server

```bash
npm start
```

Atau untuk development (auto-reload):

```bash
npm run dev
```

Server akan berjalan di `http://localhost:3000`

## Penggunaan

### Setup Awal

1. Buka `http://localhost:3000/admin.html`
2. Masuk ke tab **Pengaturan**
3. Set lokasi GPS kantor (latitude, longitude, radius)
4. Set jam kerja dan pengaturan gaji
5. Klik **Simpan Pengaturan**

### Tambah ART

1. Di Admin Dashboard, buka tab **Data ART**
2. Klik **Tambah ART**
3. Isi nama, PIN 4 digit, dan telepon
4. PIN akan otomatis di-generate hash untuk keamanan

### Clock In/Out (ART)

1. Buka `http://localhost:3000` di HP/Tablet
2. Masukkan PIN 4 digit
3. Aktifkan GPS saat diminta
4. Klik **Clock In** atau **Clock Out**
5. Sistem akan validasi lokasi GPS (maks 500m dari kantor)

### Laporan Gaji

1. Di Admin Dashboard, buka tab **Laporan Gaji**
2. Pilih ART, bulan, dan tahun
3. Klik **Tampilkan**
4. Laporan akan menampilkan detail perhitungan gaji

## Struktur Folder

```
clock-in-out/
├── database/
│   └── schema.sql              # Database schema untuk Supabase
├── public/
│   ├── index.html             # Halaman Clock In/Out
│   ├── admin.html             # Admin Dashboard
│   └── js/
│       ├── clock.js           # Logic clock in/out
│       └── admin.js           # Logic admin dashboard
├── server.js                  # Main server Node.js
├── package.json
├── .env                       # Environment variables (jangan commit!)
├── .env.example              # Template environment variables
└── README.md
```

## Database Tables

- **employees**: Data ART (nama, PIN, telepon, status)
- **attendances**: Data absensi (clock in/out, GPS, total jam)
- **leave_records**: Data cuti/izin/sakit
- **settings**: Konfigurasi sistem (GPS, jam kerja, gaji)

## API Endpoints

### Employees
- `GET /api/employees` - Get all employees
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `POST /api/employees/verify-pin` - Verify PIN

### Attendances
- `GET /api/attendances` - Get attendances (with filters)
- `POST /api/attendances/clock-in` - Clock in
- `POST /api/attendances/clock-out` - Clock out
- `POST /api/attendances` - Create attendance (manual)
- `PUT /api/attendances/:id` - Update attendance
- `DELETE /api/attendances/:id` - Delete attendance

### Leave Records
- `GET /api/leave-records` - Get leave records
- `POST /api/leave-records` - Create leave record
- `PUT /api/leave-records/:id` - Update leave record
- `DELETE /api/leave-records/:id` - Delete leave record

### Salary
- `GET /api/salary-report` - Get salary report

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings/:key` - Update setting

## Tips

### Mendapatkan Koordinat GPS

Gunakan salah satu cara berikut:

1. **Google Maps**:
   - Klik kanan pada lokasi
   - Copy koordinat (contoh: -6.200000, 106.816666)

2. **Smartphone GPS**:
   - Buka browser di HP
   - Akses halaman admin > Pengaturan
   - Izinkan akses lokasi
   - GPS akan otomatis terdeteksi

### Periode Absensi

Sistem menggunakan periode 29-28 setiap bulan:
- Contoh: Periode Januari = 29 Des - 28 Jan
- Cocok untuk perhitungan gaji bulanan

### Backup Data

Lakukan backup database Supabase secara berkala melalui:
- Supabase Dashboard > Database > Backups

## Troubleshooting

### GPS Tidak Akurat
- Pastikan GPS HP aktif
- Gunakan browser yang support Geolocation API (Chrome, Safari)
- Aktifkan "High Accuracy" di pengaturan lokasi HP

### PIN Salah Terus
- PIN di-hash, jadi admin harus generate PIN baru jika lupa
- Edit ART dan masukkan PIN baru

### Server Error
- Cek koneksi ke Supabase
- Pastikan semua environment variables sudah benar
- Cek logs di console

## License

MIT License - Free to use and modify

## Support

Jika ada pertanyaan atau bug, silakan buat issue di repository ini.
