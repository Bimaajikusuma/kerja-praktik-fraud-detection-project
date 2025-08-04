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

// Email configuration (configure with your email service)
const transporter = nodemailer.createTransport({
    service: 'gmail', // Change to your email service
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// Simple fraud detection algorithm
class FraudDetector {
    static analyzeTransaction(transaction) {
        let suspicionScore = 0;
        
        // Rule-based fraud detection
        const amount = parseFloat(transaction.amount || transaction.jumlah || 0);
        if (amount > 10000) suspicionScore += 30;
        if (amount > 50000) suspicionScore += 50;
        
        // Time-based analysis
        const timestamp = transaction.timestamp || transaction.waktu || transaction.date;
        if (timestamp) {
            const hour = new Date(timestamp).getHours();
            if (hour < 6 || hour > 22) suspicionScore += 20;
        }
        
        // Frequency analysis (simplified)
        const frequency = parseInt(transaction.frequency || transaction.frekuensi || 0);
        if (frequency > 10) suspicionScore += 25;
        
        // Location-based (simplified)
        if (transaction.location && transaction.location.toLowerCase().includes('unknown')) {
            suspicionScore += 15;
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
                    confidence: Math.random() * 0.4 + 0.6,
                    analysis_date: new Date().toISOString()
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
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

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
        
        // Store results
        const resultsId = `results-${Date.now()}`;
        const resultsPath = path.join('results', `${resultsId}.json`);
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
            resultsId: resultsId
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export Excel route
app.get('/api/export/excel/:resultsId', async (req, res) => {
    try {
        const { resultsId } = req.params;
        const resultsPath = path.join('results', `${resultsId}.json`);
        
        if (!fs.existsSync(resultsPath)) {
            return res.status(404).json({ error: 'Results not found' });
        }
        
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        
        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Fraud Detection Results');
        
        // Add headers
        const headers = ['ID', 'Fraud Prediction', 'Confidence', 'Analysis Date'];
        if (results.transactions.length > 0) {
            const firstTransaction = results.transactions[0];
            Object.keys(firstTransaction).forEach(key => {
                if (!['id', 'fraud_prediction', 'confidence', 'analysis_date'].includes(key)) {
                    headers.push(key.replace(/_/g, ' ').toUpperCase());
                }
            });
        }
        
        worksheet.addRow(headers);
        
        // Add data
        results.transactions.forEach(transaction => {
            const row = [
                transaction.id,
                transaction.fraud_prediction,
                (transaction.confidence * 100).toFixed(1) + '%',
                new Date(transaction.analysis_date).toLocaleString()
            ];
            
            Object.keys(transaction).forEach(key => {
                if (!['id', 'fraud_prediction', 'confidence', 'analysis_date'].includes(key)) {
                    row.push(transaction[key]);
                }
            });
            
            worksheet.addRow(row);
        });
        
        // Style the worksheet
        worksheet.getRow(1).font = { bold: true };
        worksheet.columns.forEach(column => {
            column.width = 15;
        });
        
        // Send file
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=fraud-detection-results.xlsx');
        
        await workbook.xlsx.write(res);
        res.end();
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export PDF route
app.get('/api/export/pdf/:resultsId', async (req, res) => {
    try {
        const { resultsId } = req.params;
        const resultsPath = path.join('results', `${resultsId}.json`);
        
        if (!fs.existsSync(resultsPath)) {
            return res.status(404).json({ error: 'Results not found' });
        }
        
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        
        // Create PDF
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=fraud-detection-results.pdf');
        
        doc.pipe(res);
        
        // Add content
        doc.fontSize(20).text('Fraud Detection Analysis Report', 50, 50);
        doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, 50, 80);
        doc.text(`Analysis ID: ${resultsId}`, 50, 100);
        
        // Summary
        doc.fontSize(16).text('Summary', 50, 140);
        doc.fontSize(12)
           .text(`Total Transactions: ${results.total}`, 50, 165)
           .text(`Suspicious Transactions: ${results.suspicious}`, 50, 185)
           .text(`Normal Transactions: ${results.normal}`, 50, 205)
           .text(`Fraud Rate: ${((results.suspicious / results.total) * 100).toFixed(1)}%`, 50, 225);
        
        // Transaction details (first 20 transactions)
        doc.fontSize(16).text('Transaction Details (Sample)', 50, 265);
        let yPosition = 290;
        
        results.transactions.slice(0, 20).forEach((transaction, index) => {
            if (yPosition > 700) {
                doc.addPage();
                yPosition = 50;
            }
            
            doc.fontSize(10)
               .text(`${transaction.id}. ${transaction.fraud_prediction.toUpperCase()} - Confidence: ${(transaction.confidence * 100).toFixed(1)}%`, 50, yPosition);
            yPosition += 15;
        });
        
        doc.end();
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Email report route
app.post('/api/email-report', async (req, res) => {
    try {
        const { to, subject, message, attachments, resultsId } = req.body;
        
        if (!resultsId) {
            return res.status(400).json({ error: 'Results ID is required' });
        }
        
        const resultsPath = path.join('results', `${resultsId}.json`);
        if (!fs.existsSync(resultsPath)) {
            return res.status(404).json({ error: 'Results not found' });
        }
        
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        
        // Prepare email
        const mailOptions = {
            from: process.env.EMAIL_USER || 'your-email@gmail.com',
            to: to,
            subject: subject || 'Fraud Detection Report',
            html: `
                <h2>Fraud Detection Analysis Report</h2>
                <p>${message || 'Please find attached the fraud detection analysis results.'}</p>
                
                <h3>Summary:</h3>
                <ul>
                    <li>Total Transactions: ${results.total}</li>
                    <li>Suspicious Transactions: ${results.suspicious}</li>
                    <li>Normal Transactions: ${results.normal}</li>
                    <li>Fraud Rate: ${((results.suspicious / results.total) * 100).toFixed(1)}%</li>
                </ul>
                
                <p>Generated on: ${new Date().toLocaleString()}</p>
            `,
            attachments: []
        };
        
        // Add attachments if requested
        if (attachments && attachments.includes('excel')) {
            // Generate Excel attachment
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Fraud Detection Results');
            
            const headers = ['ID', 'Fraud Prediction', 'Confidence', 'Analysis Date'];
            if (results.transactions.length > 0) {
                const firstTransaction = results.transactions[0];
                Object.keys(firstTransaction).forEach(key => {
                    if (!['id', 'fraud_prediction', 'confidence', 'analysis_date'].includes(key)) {
                        headers.push(key.replace(/_/g, ' ').toUpperCase());
                    }
                });
            }
            
            worksheet.addRow(headers);
            
            results.transactions.forEach(transaction => {
                const row = [
                    transaction.id,
                    transaction.fraud_prediction,
                    (transaction.confidence * 100).toFixed(1) + '%',
                    new Date(transaction.analysis_date).toLocaleString()
                ];
                
                Object.keys(transaction).forEach(key => {
                    if (!['id', 'fraud_prediction', 'confidence', 'analysis_date'].includes(key)) {
                        row.push(transaction[key]);
                    }
                });
                
                worksheet.addRow(row);
            });
            
            const excelBuffer = await workbook.xlsx.writeBuffer();
            mailOptions.attachments.push({
                filename: 'fraud-detection-results.xlsx',
                content: excelBuffer
            });
        }
        
        if (attachments && attachments.includes('pdf')) {
            // Generate PDF attachment
            const pdfBuffer = await new Promise((resolve, reject) => {
                const chunks = [];
                const doc = new PDFDocument();
                
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);
                
                // Add PDF content
                doc.fontSize(20).text('Fraud Detection Analysis Report', 50, 50);
                doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, 50, 80);
                doc.text(`Analysis ID: ${resultsId}`, 50, 100);
                
                doc.fontSize(16).text('Summary', 50, 140);
                doc.fontSize(12)
                   .text(`Total Transactions: ${results.total}`, 50, 165)
                   .text(`Suspicious Transactions: ${results.suspicious}`, 50, 185)
                   .text(`Normal Transactions: ${results.normal}`, 50, 205)
                   .text(`Fraud Rate: ${((results.suspicious / results.total) * 100).toFixed(1)}%`, 50, 225);
                
                doc.end();
            });
            
            mailOptions.attachments.push({
                filename: 'fraud-detection-results.pdf',
                content: pdfBuffer
            });
        }
        
        // Send email
        await transporter.sendMail(mailOptions);
        
        res.json({
            success: true,
            message: 'Email sent successfully'
        });
        
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ error: 'Email sending failed: ' + error.message });
    }
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
    console.log(`📧 Email service: ${process.env.EMAIL_USER ? 'Configured' : 'Not configured (set EMAIL_USER and EMAIL_PASS)'}`);
});

module.exports = app;