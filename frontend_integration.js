// Frontend API Integration for FraudDetection
// Add this to your HTML file or create as separate JS file

class FraudDetectionAPI {
    constructor(baseURL = 'http://localhost:3000') {
        this.baseURL = baseURL;
        this.currentFile = null;
        this.currentResults = null;
    }

    // Upload file to backend
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${this.baseURL}/api/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const result = await response.json();
            this.currentFile = result.file;
            return result;
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }

    // Start fraud analysis
    async analyzeData(filename) {
        try {
            const response = await fetch(`${this.baseURL}/api/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ filename })
            });

            if (!response.ok) {
                throw new Error(`Analysis failed: ${response.statusText}`);
            }

            const result = await response.json();
            this.currentResults = result;
            return result;
        } catch (error) {
            console.error('Analysis error:', error);
            throw error;
        }
    }

    // Export to Excel
    async exportToExcel(resultsId) {
        try {
            const response = await fetch(`${this.baseURL}/api/export/excel/${resultsId}`);
            
            if (!response.ok) {
                throw new Error(`Export failed: ${response.statusText}`);
            }

            const blob = await response.blob();
            this.downloadFile(blob, 'fraud-detection-results.xlsx');
        } catch (error) {
            console.error('Excel export error:', error);
            throw error;
        }
    }

    // Export to PDF
    async exportToPDF(resultsId) {
        try {
            const response = await fetch(`${this.baseURL}/api/export/pdf/${resultsId}`);
            
            if (!response.ok) {
                throw new Error(`Export failed: ${response.statusText}`);
            }

            const blob = await response.blob();
            this.downloadFile(blob, 'fraud-detection-results.pdf');
        } catch (error) {
            console.error('PDF export error:', error);
            throw error;
        }
    }

    // Send email report
    async sendEmailReport(emailData) {
        try {
            const response = await fetch(`${this.baseURL}/api/email-report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailData)
            });

            if (!response.ok) {
                throw new Error(`Email failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console