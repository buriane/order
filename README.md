# 📦 Stokin

<div align="center">

![Stokin Banner](https://img.shields.io/badge/Stokin-Manajemen%20Stok%20%26%20Order-10B981?style=for-the-badge&logoColor=white)

[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Typed-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-Styling-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Zod](https://img.shields.io/badge/Zod-Validation-3E67B1?style=flat-square&logo=zod&logoColor=white)](https://zod.dev/)

</div>

---

## 📋 Daftar Isi

- [Tentang Proyek](#-tentang-proyek)
- [Fitur Utama](#-fitur-utama)
- [Tech Stack](#-tech-stack)
- [Struktur Database](#-struktur-database)
- [Struktur Proyek](#-struktur-proyek)
- [Cara Menjalankan](#-cara-menjalankan)
- [Alur Penggunaan](#-alur-penggunaan)

---

## 🔍 Tentang Proyek

**Stokin** adalah aplikasi web **Manajemen Stok & Order** yang dirancang untuk mencatat sisa stok (*leftover*) dan jumlah order (*order*) per bahan atau barang setiap harinya. Khusus untuk role tertentu, aplikasi ini juga mendukung pembuatan **laporan PDF** otomatis berdasarkan tanggal yang dipilih.

### 🧠 Deskripsi Teknis

- Membangun aplikasi fullstack menggunakan **Next.js App Router** dengan **Server Actions** untuk operasi upsert data stok & order secara massal
- Mengimplementasikan sistem **autentikasi dan otorisasi berbasis role** (`employee` / `owner`) menggunakan **Supabase Auth** dan **Row Level Security (RLS)** di level database
- Mengelola logika tanggal laporan dan order berbasis zona waktu **Asia/Jakarta**, dengan sinkronisasi pergantian hari otomatis di sisi klien
- Mengintegrasikan **pdf-lib** untuk pembuatan laporan PDF dinamis langsung dari server

### 🎯 Tujuan Sistem

- Mempermudah pencatatan **sisa stok harian** dan **jumlah order** per bahan/barang
- Membatasi akses fitur sensitif (manajemen barang, cetak PDF) hanya untuk role **owner**
- Memberikan **notifikasi real-time** kepada owner ketika pegawai menginput data hari tersebut

---

## ✨ Fitur Utama

### 🔐 Autentikasi & Otorisasi Berbasis Role
- Login via **Supabase Auth** (`signInWithPassword`)
- Dua role pengguna: **`employee`** (pegawai) dan **`owner`** (pemilik)
- Akses dibatasi menggunakan **Row Level Security (RLS)** di level Postgres

### 📋 Dashboard Input Stok & Order
- Menampilkan daftar barang aktif (`is_active = true`) dari tabel `public.items`
- Input **Sisa** (*leftover_qty*) dan **Order** (*order_qty*) per item
- Penyimpanan massal via **Server Action** menggunakan upsert berdasarkan `item_id` dan tanggal

### 📅 Manajemen Tanggal Otomatis
- Tanggal laporan (`report_date`) dan tanggal order (`order_for_date = report_date + 1 hari`)
- Penanganan zona waktu **Asia/Jakarta** via `src/lib/jakarta-date.ts`
- **Sinkronisasi pergantian hari otomatis** di sisi klien

### 👑 Fitur Khusus Owner
- **Manajemen barang**: tambah, ubah, dan nonaktifkan item (`addItemAction`, `updateItemAction`, `deleteItemAction`)
- **Cetak laporan PDF** untuk tanggal tertentu via endpoint `/api/orders/pdf`
- **Notifikasi real-time** ketika pegawai menginput data hari tersebut

### 📄 Laporan PDF Otomatis
- Dibuat menggunakan **pdf-lib** di sisi server
- Kolom laporan mencakup nama barang, sisa stok, jumlah order, dan harga beli (dari field `note`)
- Dapat diunduh langsung dari dashboard

---

## 🛠 Tech Stack

| Teknologi | Peran |
|-----------|-------|
| **Next.js (App Router)** | Framework fullstack utama, routing, & Server Actions |
| **React + TypeScript** | UI component & type safety |
| **Tailwind CSS** | Styling antarmuka pengguna |
| **Supabase Auth** | Autentikasi login & manajemen sesi |
| **Supabase Postgres + RLS** | Database dengan keamanan berbasis role |
| **Zod** | Validasi input di Server Actions |
| **date-fns** | Formatting & kalkulasi tanggal (locale Indonesia) |
| **lucide-react** | Ikon antarmuka pengguna |
| **pdf-lib** | Pembuatan laporan PDF di sisi server |

---

## 🗄 Struktur Database

### Tabel Utama

**`public.items`** — Daftar barang/bahan
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | uuid | Primary key |
| `name` | text | Nama barang/bahan |
| `unit` | text | Satuan (kg, liter, pcs, dll.) |
| `is_active` | boolean | Status aktif/nonaktif |

**`public.inventory_entries`** — Catatan stok & order harian
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | uuid | Primary key |
| `item_id` | uuid | Referensi ke `items.id` |
| `report_date` | date | Tanggal laporan |
| `order_for_date` | date | Tanggal order (`report_date + 1`) |
| `leftover_qty` | numeric | Jumlah sisa stok |
| `order_qty` | numeric | Jumlah order |
| `note` | text | Harga beli (ditampilkan di PDF) |

**`public.profiles`** — Role pengguna
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | uuid | Referensi ke `auth.users` |
| `role` | text | `employee` atau `owner` |

---

## 📁 Struktur Proyek

```
stokin/
├── src/
│   ├── app/
│   │   ├── login/
│   │   │   └── page.tsx                  # Halaman login
│   │   ├── dashboard/
│   │   │   ├── page.tsx                  # Halaman utama dashboard
│   │   │   └── actions.ts                # Server Actions (upsert, CRUD item)
│   │   └── api/
│   │       └── orders/
│   │           └── pdf/
│   │               └── route.ts          # Endpoint generate laporan PDF
│   ├── components/
│   │   ├── auth-form.tsx                 # Form login Supabase
│   │   ├── owner-notification-listener.tsx  # Notifikasi real-time untuk owner
│   │   └── dashboard-auto-day-sync.tsx   # Sinkronisasi pergantian hari otomatis
│   └── lib/
│       ├── jakarta-date.ts               # Utilitas tanggal zona Asia/Jakarta
│       └── supabase/
│           ├── server.ts                 # Supabase client untuk SSR
│           └── client.ts                 # Supabase client untuk browser
├── supabase/
│   └── schema.sql                        # Skema database & konfigurasi RLS
├── public/                               # Aset statis
├── package.json                          # Dependensi & scripts
├── tailwind.config.ts                    # Konfigurasi Tailwind CSS
├── tsconfig.json                         # Konfigurasi TypeScript
└── README.md
```

---

## 🚀 Cara Menjalankan

### Prasyarat

- **Node.js 18+** — https://nodejs.org/
- **Akun Supabase** — https://supabase.com/ (untuk database & autentikasi)
- Package manager: **npm**, **yarn**, **pnpm**, atau **bun**

### Langkah Instalasi

**1. Clone repositori**
```bash
git clone https://github.com/username/stokin.git
cd stokin
```

**2. Install dependensi**
```bash
npm install
# atau
bun install
```

**3. Konfigurasi environment**

Buat file `.env.local` di root proyek:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**4. Setup database Supabase**

Jalankan skema SQL di Supabase SQL Editor:
```bash
# Salin dan jalankan isi file berikut di Supabase Dashboard > SQL Editor
supabase/schema.sql
```

**5. Jalankan development server**
```bash
npm run dev
# atau
bun dev
```

Aplikasi akan berjalan di http://localhost:3000

### Scripts Tersedia

```bash
npm run dev      # Jalankan development server
npm run build    # Build untuk produksi
npm run start    # Jalankan hasil build
npm run lint     # Linting dengan ESLint
```

---

## 🔄 Alur Penggunaan

```
User membuka aplikasi
         │
         ▼
   Login via Supabase Auth
   (email & password)
         │
         ▼
   Cek Role di public.profiles
         │
    ┌────┴────┐
    ▼         ▼
EMPLOYEE    OWNER
    │         │
    │    Semua fitur Employee +
    │    - Kelola daftar barang
    │    - Cetak laporan PDF
    │    - Notifikasi input pegawai
    │         │
    └────┬────┘
         ▼
   Dashboard Stok & Order
   (tanggal otomatis Asia/Jakarta)
         │
         ▼
   Input Sisa & Order per Item
         │
         ▼
   Simpan Massal via Server Action
   (upsert berdasarkan item_id + tanggal)
         │
         ├────────────────────────┐
         ▼                        ▼
  Data tersimpan           Notifikasi dikirim
  di inventory_entries      ke Owner (real-time)
         │
         ▼ (khusus Owner)
   Generate Laporan PDF
   (/api/orders/pdf?date=...)
         │
         ▼
   PDF diunduh berisi:
   Nama Barang | Sisa | Order | Harga Beli
```

---

<div align="center">

📦 *Stok terpantau, order terencana, bisnis berjalan lancar.*

</div>
