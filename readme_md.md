# FraudDetection Backend API

Backend API untuk aplikasi FraudDetection yang menganalisis data transaksi untuk mendeteksi aktivitas penipuan menggunakan algoritma machine learning.

## Fitur Utama

- 📁 Upload file CSV/Excel
- 🤖 Analisis fraud detection menggunakan algoritma rule-based
- 📊 Export hasil ke Excel dan PDF
- 📧 Kirim laporan via email
- ⚡ RESTful API dengan Express.js
- 🔒 File upload dengan validasi dan keamanan

## Teknologi yang Digunakan

- **Node.js** - Runtime JavaScript
- **Express.js** - Web framework
- **Multer** - File upload handling
- **ExcelJS** - Excel file processing
- **PDFKit** - PDF generation
- **Nodemailer** - Email sending
- **CSV-Parser** - CSV file parsing

## Instalasi

### 1. Clone atau Download Project

```bash
git clone <repository-url>
cd fraud-detection-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Salin file `.env.example` menjadi `.env` dan sesuaikan konfigurasi:

```bash
cp .env.example .env
```

Edit file `.env`:
```env
PORT=3000
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 4. Buat Direktori yang Diperlukan

```bash
mkdir uploads results public
```

### 5. Jalankan Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server akan berjalan di `http://localhost:3000`

## API Endpoints

### 1. Health Check
```
GET /api/health
```
Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Upload File
```
POST /api/upload
Content-Type: multipart/form-data
```
Body: File dengan key `file`

Response:
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "filename": "file-123456789.csv",
    "originalname": "data.csv",
    "size": 1048576,
    "path": "uploads/file-123456789.csv"
  }
}
```

### 3. Analisis Fraud Detection
```
POST /api/analyze
Content-Type: application/json
```
Body:
```json
{
  "filename": "file-123456789.csv"
}
```

Response:
```json
{
  "success": true,
  "results": {
    "total": 334,
    "suspicious": 167,
    "normal": 167
  },
  "resultsId": "results-123456789"
}
```

### 4. Export ke Excel
```
GET /api/export/excel/:resultsId
```
Download file Excel dengan hasil analisis

### 5. Export ke PDF
```
GET /api/export/pdf/:resultsId
```
Download file PDF dengan hasil analisis

### 6. Kirim Email Report
```
POST /api/email-report
Content-Type: application/json
```
Body:
```json
{
  "to": "recipient@email.com",
  "subject": "Fraud Detection Report",
  "message": "Ini adalah laporan hasil analisis fraud detection",
  "attachments": ["excel", "pdf"],
  "resultsId": "results-123456789"
}
```

## Struktur Project

```
fraud-detection-backend/
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env.example          # Environment variables template
├── README.md             # Documentation
├── uploads/              # Uploaded files directory
├── results/              # Analysis results directory
└── public/               # Static files (optional)
```

## Algoritma Fraud Detection

Backend menggunakan algoritma rule-based sederhana yang menganalisis:

1. **Amount Analysis** - Transaksi dengan jumlah besar (>10K, >50K)
2. **Time Analysis** - Transaksi di luar jam normal (22:00-06:00)
3. **Frequency Analysis** - Transaksi dengan frekuensi tinggi
4. **Location Analysis** - Lokasi berisiko tinggi
5. **Merchant Category** - Kategori merchant berisiko

Setiap faktor memberikan skor suspicion, dan transaksi dengan skor >50 diklasifikasikan sebagai "suspicious".

## Format Data yang Didukung

### CSV Format
```csv
amount,timestamp,merchant,location,merchant_category,frequency
1000,2024-01-01 10:00:00,Store A,Jakarta,retail,1
50000,2024-01-01 23:30:00,Casino B,Bali,gambling,5
```

### Excel Format
Sama seperti CSV, tetapi dalam format .xlsx atau .xls

## Konfigurasi Email

Untuk fitur email, Anda perlu:

1. **Gmail App Password**:
   - Aktifkan 2-factor authentication
   - Generate App Password di Google Account settings
   - Gunakan App Password sebagai `EMAIL_PASS`

2. **SMTP Lain**:
   Edit konfigurasi transporter di `server.js`:
   ```javascript
   const transporter = nodemailer.createTransporter({
       host: 'your-smtp-host',
       port: 587,
       secure: false,
       auth: {
           user: 'your-email',
           pass: 'your-password'
       }
   });
   ```

## Pengembangan Lanjutan

### 1. Database Integration
Tambahkan database untuk menyimpan hasil analisis:
```javascript
// Install: npm install pg sequelize
const { Sequelize } = require('sequelize');
```

### 2. Machine Learning Integration
Integrasikan dengan model ML external:
```javascript
// Install: npm install @tensorflow/tfjs-node
const tf = require('@tensorflow/tfjs-node');
```

### 3. Authentication
Tambahkan JWT authentication:
```javascript
// Install: npm install jsonwebtoken bcryptjs
const jwt = require('jsonwebtoken');
```

### 4. Rate Limiting
Tambahkan rate limiting:
```javascript
// Install: npm install express-rate-limit
const rateLimit = require('express-rate-limit');
```

## Testing

Jalankan test (jika sudah dibuat):
```bash
npm test
```

## Production Deployment

### 1. PM2 (Process Manager)
```bash
npm install -g pm2
pm2 start server.js --name fraud-detection
pm2 startup
pm2 save
```

### 2. Docker
Buat `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 3. Environment Variables
Set production environment variables:
```bash
export NODE_ENV=production
export PORT=3000
export EMAIL_USER=your-production-email
export EMAIL_PASS=your-production-password
```

## Troubleshooting

### 1. File Upload Gagal
- Pastikan direktori `uploads/` exists dan writable
- Check file size limit (default 100MB)
- Pastikan file format CSV/Excel

### 2. Email Tidak Terkirim
- Verify email credentials di `.env`
- Check firewall/network restrictions
- Test dengan email provider lain

### 3. Memory Issues
- Untuk file besar, consider streaming processing
- Set Node.js memory limit: `node --max-old-space-size=4096 server.js`

## Support

Jika ada pertanyaan atau masalah, silakan buat issue di repository atau hubungi tim development.

## License

MIT License - see LICENSE file for details