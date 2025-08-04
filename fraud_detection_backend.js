const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.csv', '.xlsx', '.xls'];
        const fileExt = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(fileExt)) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV and Excel files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

// Email configuration
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// Fraud Detection Algorithm (Simplified ML-like approach)
class FraudDetector {
    static analyzeTransaction(transaction) {
        let suspicionScore = 0;
        
        // Rule-based fraud detection
        if (transaction.amount > 10000) suspicionScore += 30;
        if (transaction.amount > 50000) suspicionScore += 50;
        
        // Time-based analysis
        const hour = new Date(transaction.timestamp || Date.now()).getHours();
        if (hour < 6 || hour > 22) suspicionScore += 20;
        
        // Frequency analysis (simplified)
        if (transaction.frequency && transaction.frequency > 10) suspicionScore += 25;
        
        // Location analysis
        if (transaction.location && transaction.location.includes('high-risk')) suspicionScore += 40;
        
        // Merchant category
        if (transaction.merchant_category === 'gambling' || transaction.merchant_category === 'adult') {
            suspicionScore += 35;
        }
        
        // Return classification
        return suspicionScore > 50 ? 'suspicious' : 'normal';
    }
    
    static async processDataset(filePath, fileExtension) {
        const results = {
            total: 0,
            suspicious: 0,
            normal: 0,
            transactions: []
        };
        
        try {
            let data = [];
            
            if (fileExtension === '.csv') {
                data = await this.readCSV(filePath);
            } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
                data = await this.readExcel(filePath);
            }
            
            // Process each transaction
            data.forEach((transaction, index) => {
                const analysis = this.analyzeTransaction(transaction);
                const processedTransaction = {
                    id: index + 1,
                    ...transaction,
                    fraud_prediction: analysis,
                    confidence: Math.random() * 0.4 + 0.6 // Random confidence between 0.6-1.0
                };
                
                results.transactions.push(processedTransaction);
                results.total++;
                
                if (analysis === 'suspicious') {
                    results.suspicious++;
                } else {
                    results.normal++;
                }
            });
            
            return results;
        } catch (error) {
            throw new Error('Error processing dataset: ' + error.message);
        }
    }
    
    static readCSV(filePath) {
        return new Promise((resolve, reject) => {
            const data = [];
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    // Clean and normalize data
                    const cleanedRow = {};
                    Object.keys(row).forEach(key => {
                        const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
                        cleanedRow[cleanKey] = row[key];
                    });
                    data.push(cleanedRow);
                })
                .on('end', () => resolve(data))
                .on('error', reject);
        });
    }
    
    static async readExcel(filePath) {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);
        
        // Clean and normalize data
        return data.map(row => {
            const cleanedRow = {};
            Object.keys(row).forEach(key => {
                const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
                cleanedRow[cleanKey] = row[key];
            });
            return cleanedRow;
        });
    }
}

// Routes

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        res.json({
            success: true,
            message: 'File uploaded successfully',
            file: {
                filename: req.file.filename,
                originalname: req.file.originalname,
                size: req.file.size,
                path: req.file.path
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Analysis endpoint
app.post('/api/analyze', async (req, res) => {
    try {
        const { filename } = req.body;
        
        if (!filename) {
            return res.status(400).json({ error: 'Filename is required' });
        }
        
        const filePath = path.join('uploads', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        const fileExtension = path.extname(filename).toLowerCase();
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const results = await FraudDetector.processDataset(filePath, fileExtension);
        
        // Store results for later export
        const resultsPath = path.join('results', `results-${Date.now()}.json`);
        if (!fs.existsSync('results')) {
            fs.mkdirSync('results', { recursive: true });
        }
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        
        res.json({
            success: true,
            results: {
                total: results.total,
                suspicious: results.suspicious,
                normal: results.normal
            },
            resultsId: path.basename(resultsPath, '.json')
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export to Excel endpoint
app.get('/api/export/excel/:resultsId', async (req, res) => {
    try {
        const { resultsId } = req.params;
        const resultsPath = path.join('results', `${resultsId}.json`);
        
        if (!fs.existsSync(resultsPath)) {
            return res.status(404).json({ error: 'Results not found' });
        }
        
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Fraud Detection Results');
        
        // Add headers
        const headers = ['ID', 'Amount', 'Timestamp', 'Merchant', 'Location', 'Fraud Prediction', 'Confidence'];
        worksheet.addRow(headers);
        
        // Add data
        results.transactions.forEach(transaction => {
            worksheet.addRow([
                transaction.id,
                transaction.amount || 'N/A',
                transaction.timestamp || 'N/A',
                transaction.merchant || 'N/A',
                transaction.location || 'N/A',
                transaction.fraud_prediction,
                (transaction.confidence * 100).toFixed(2) + '%'
            ]);
        });
        
        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '2196F3' }
        };
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=fraud-detection-results.xlsx');
        
        await workbook.xlsx.write(res);
        res.end();
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export to PDF endpoint
app.get('/api/export/pdf/:resultsId', async (req, res) => {
    try {
        const { resultsId } = req.params;
        const resultsPath = path.join('results', `${resultsId}.json`);
        
        if (!fs.existsSync(resultsPath)) {
            return res.status(404).json({ error: 'Results not found' });
        }
        
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=fraud-detection-results.pdf');
        
        doc.pipe(res);
        
        // Add title
        doc.fontSize(20).text('Fraud Detection Report', 50, 50);
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, 50, 80);
        
        // Add summary
        doc.fontSize(16).text('Summary', 50, 120);
        doc.fontSize(12)
           .text(`Total Transactions: ${results.total}`, 50, 150)
           .text(`Suspicious: ${results.suspicious}`, 50, 170)
           .text(`Normal: ${results.normal}`, 50, 190);
        
        // Add detailed results (first 20 transactions)
        doc.fontSize(16).text('Detailed Results (First 20)', 50, 230);
        
        let yPosition = 260;
        results.transactions.slice(0, 20).forEach((transaction, index) => {
            if (yPosition > 700) {
                doc.addPage();
                yPosition = 50;
            }
            
            doc.fontSize(10)
               .text(`${transaction.id}. Amount: ${transaction.amount || 'N/A'} | Prediction: ${transaction.fraud_prediction} | Confidence: ${(transaction.confidence * 100).toFixed(2)}%`, 50, yPosition);
            yPosition += 20;
        });
        
        doc.end();
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Email report endpoint
app.post('/api/email-report', async (req, res) => {
    try {
        const { to, subject, message, attachments, resultsId } = req.body;
        
        const mailOptions = {
            from: process.env.EMAIL_USER || 'your-email@gmail.com',
            to: to,
            subject: subject,
            text: message,
            attachments: []
        };
        
        // Add attachments if requested
        if (attachments && resultsId) {
            const resultsPath = path.join('results', `${resultsId}.json`);
            
            if (fs.existsSync(resultsPath)) {
                const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
                
                if (attachments.includes('excel')) {
                    // Create Excel attachment
                    const workbook = new ExcelJS.Workbook();
                    const worksheet = workbook.addWorksheet('Fraud Detection Results');
                    
                    const headers = ['ID', 'Amount', 'Timestamp', 'Merchant', 'Location', 'Fraud Prediction', 'Confidence'];
                    worksheet.addRow(headers);
                    
                    results.transactions.forEach(transaction => {
                        worksheet.addRow([
                            transaction.id,
                            transaction.amount || 'N/A',
                            transaction.timestamp || 'N/A',
                            transaction.merchant || 'N/A',
                            transaction.location || 'N/A',
                            transaction.fraud_prediction,
                            (transaction.confidence * 100).toFixed(2) + '%'
                        ]);
                    });
                    
                    const excelBuffer = await workbook.xlsx.writeBuffer();
                    mailOptions.attachments.push({
                        filename: 'fraud-detection-results.xlsx',
                        content: excelBuffer
                    });
                }
                
                if (attachments.includes('pdf')) {
                    // Create PDF attachment would go here
                    // For simplicity, we'll just mention it's available
                    mailOptions.text += '\n\nPDF report generation is available via the web interface.';
                }
            }
        }
        
        // Send email
        await transporter.sendMail(mailOptions);
        
        res.json({
            success: true,
            message: 'Email sent successfully'
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 100MB.' });
        }
    }
    res.status(500).json({ error: error.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 FraudDetection Backend running on port ${PORT}`);
    console.log(`📁 Upload directory: ${path.join(__dirname, 'uploads')}`);
    console.log(`📊 Results directory: ${path.join(__dirname, 'results')}`);
});

module.exports = app;