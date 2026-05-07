const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const ejs = require('ejs');
const csv = require('csv-parser');
const { parseEnvelopeDataFromPdf } = require('./pdfParser');

const app = express();
const PORT = process.env.PORT || 5001;
const bwipjs = require('bwip-js');
const upload = multer({ dest: 'uploads/' });

const jobs = {};
let browserInstance = null;

async function getBrowser() {
    if (!browserInstance) {
        console.log("Launching new browser instance...");
        browserInstance = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--memory-pressure-thresholds=medium'],
            timeout: 120000 // Increase timeout to 2 minutes
        });
        
        // Handle unexpected browser closure
        browserInstance.on('disconnected', () => {
            console.log("Browser disconnected. Resetting instance.");
            browserInstance = null;
        });
    }
    return browserInstance;
}

app.post('/generate-pdfs', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'headerImage', maxCount: 1 }]), (req, res) => {
    if (!req.files || !req.files.file) {
        return res.status(400).json({ error: 'CSV file is required' });
    }

    const fileObj = req.files.file[0];
    const filePath = fileObj.path;
    const originalFileName = fileObj.originalname;
    const jobId = Date.now().toString();

    let headerImagePath = null;
    if (req.files.headerImage && req.files.headerImage.length > 0) {
        headerImagePath = req.files.headerImage[0].path;
    }

    jobs[jobId] = {
        isCancelled: false,
        done: false,
        progress: 0,
        total: 0,
        resultPdfUrl: null,
        error: null,
        status: 'Reading CSV file...'
    };

    const senderInfo = {
        from: req.body.senderFrom,
        mobile: req.body.senderMobile,
        address: req.body.senderAddress
    };

    // Run async without awaiting
    processCSVAndGeneratePDFs(filePath, headerImagePath, originalFileName, jobId, senderInfo).catch((err) => {
        console.error(`Error in job ${jobId}:`, err);
    });

    res.status(200).json({ jobId, message: 'PDF generation started' });
});

app.post('/check-duplicates', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'CSV file is required' });
    }

    const filePath = req.file.path;
    const barcodes = {};
    const duplicates = [];
    const rows = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', () => {
            rows.forEach((row, index) => {
                const barcode = row['barcode'] || row['LAN'] || row['id'];
                if (barcode) {
                    if (barcodes[barcode]) {
                        duplicates.push({ barcode, row: index + 2, name: row['name'] || 'N/A' });
                    } else {
                        barcodes[barcode] = true;
                    }
                }
            });

            fs.unlink(filePath, (err) => {
                if (err) console.error('Failed to delete temp file:', err);
            });

            res.json({ duplicateCount: duplicates.length, duplicates });
        })
        .on('error', (err) => {
            fs.unlink(filePath, () => { });
            res.status(500).json({ error: 'Error processing CSV: ' + err.message });
        });
});

app.get('/status/:jobId', (req, res) => {
    const job = jobs[req.params.jobId];
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
});

app.post('/cancel/:jobId', (req, res) => {
    const job = jobs[req.params.jobId];
    if (job) {
        job.isCancelled = true;
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Job not found' });
    }
});

app.get('/sample.csv', (req, res) => {
    const csvContent = "barcode,name,Address,mobile number\n123456789,John Doe,123 Main St City State 12345,9876543210\n";
    res.header('Content-Type', 'text/csv');
    res.attachment('sample_cover_letter.csv');
    return res.send(csvContent);
});

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bulk Envelope Generator</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <script>
                tailwind.config = {
                    darkMode: 'class',
                    theme: {
                        extend: {
                            fontFamily: {
                                sans: ['Inter', 'sans-serif'],
                            }
                        }
                    }
                }
            </script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Inter', sans-serif; }
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(107, 114, 128, 0.8); }
            </style>
        </head>
        <body class="bg-transparent text-gray-900 dark:text-gray-100 min-h-screen p-6 antialiased transition-colors duration-300">
            <div class="max-w-4xl mx-auto">
                <div class="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8 transition-all duration-300">
                    <div class="flex items-center gap-4 mb-8">
                        <div class="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg relative">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <div class="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                        </div>
                        <div>
                            <h2 class="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                                Bulk Cover Letters
                            </h2>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Upload your CSV to generate merged PDFs seamlessly</p>
                        </div>
                    </div>

                    <form id="uploadForm" class="mb-6">
                        <div class="flex flex-col gap-4 mb-4">
                            <div>
                                <div class="flex justify-between items-center mb-2">
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">1. Upload CSV Data (Required)</label>
                                    <a href="/sample.csv" class="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-xs flex items-center gap-1 font-medium transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        Download Sample CSV
                                    </a>
                                </div>
                                <input type="file" id="csvFile" name="file" accept=".csv" required 
                                    class="block w-full text-sm text-gray-500 dark:text-gray-400
                                        file:mr-4 file:py-2.5 file:px-4
                                        file:rounded-xl file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-indigo-50 file:text-indigo-700
                                        dark:file:bg-indigo-900/30 dark:file:text-indigo-300
                                        hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50
                                        transition-all cursor-pointer border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 focus:outline-none dark:bg-gray-800/50" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">2. Custom Header Image (Optional)</label>
                                <input type="file" id="headerImage" name="headerImage" accept="image/*" 
                                    class="block w-full text-sm text-gray-500 dark:text-gray-400
                                        file:mr-4 file:py-2.5 file:px-4
                                        file:rounded-xl file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-purple-50 file:text-purple-700
                                        dark:file:bg-purple-900/30 dark:file:text-purple-300
                                        hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50
                                        transition-all cursor-pointer border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 focus:outline-none dark:bg-gray-800/50" />
                                <p class="text-xs text-gray-500 mt-1 ml-1">Leave empty to use the default CFM ARC logo.</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">3. Sender Name (Required)</label>
                                <input type="text" id="senderFrom" name="senderFrom" required placeholder="From Name"
                                    class="block w-full text-sm text-gray-500 dark:text-gray-400 p-2.5 transition-all cursor-text border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 focus:outline-none dark:bg-gray-800/50 focus:ring-2 focus:ring-indigo-500/20" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">4. Sender Mobile (Optional)</label>
                                <input type="text" id="senderMobile" name="senderMobile" placeholder="Mobile No"
                                    class="block w-full text-sm text-gray-500 dark:text-gray-400 p-2.5 transition-all cursor-text border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 focus:outline-none dark:bg-gray-800/50 focus:ring-2 focus:ring-purple-500/20" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">5. Sender Address (Optional)</label>
                                <input type="text" id="senderAddress" name="senderAddress" placeholder="Sender Address"
                                    class="block w-full text-sm text-gray-500 dark:text-gray-400 p-2.5 transition-all cursor-text border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 focus:outline-none dark:bg-gray-800/50 focus:ring-2 focus:ring-pink-500/20" />
                            </div>
                        </div>
                        <div class="flex flex-col sm:flex-row gap-4 items-center">
                            <button type="submit" class="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium text-sm flex-shrink-0 flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                Generate PDF
                            </button>
                            <button type="button" id="checkDuplicateBtn" class="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium text-sm flex-shrink-0 flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                Check Duplicate
                            </button>
                            <button type="button" id="cancelBtn" class="hidden w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-xl shadow-md transition-all font-medium text-sm flex-shrink-0 items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                                Stop & Show
                            </button>
                        </div>
                    </form>

                    <div id="duplicateResults" class="hidden mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/50">
                        <h3 class="font-bold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                            Duplicate Records Found
                        </h3>
                        <div id="duplicateList" class="text-sm text-amber-700 dark:text-amber-300 space-y-1 max-h-40 overflow-y-auto pr-2"></div>
                    </div>

                    <div id="loader" class="hidden mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                        <div class="flex items-center gap-3 mb-2">
                            <svg class="animate-spin h-5 w-5 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span id="loaderText" class="font-medium text-indigo-700 dark:text-indigo-300">Generating PDF, please wait...</span>
                        </div>
                        <div id="progress" class="text-sm text-indigo-600/80 dark:text-indigo-400/80 ml-8 font-medium"></div>
                    </div>

                    <div id="resultContainer" class="hidden mt-6 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner bg-gray-50 dark:bg-gray-900 h-[60vh] relative">
                        <iframe id="result" class="w-full h-full border-0"></iframe>
                    </div>
                </div>
            </div>

            <script>
                // Theme Listener from parent
                window.addEventListener('message', (event) => {
                    if (event.data?.type === 'THEME_CHANGE') {
                        if (event.data.isDark) {
                            document.documentElement.classList.add('dark');
                        } else {
                            document.documentElement.classList.remove('dark');
                        }
                    }
                });

                let currentJobId = null;
                let pollInterval = null;

                document.getElementById('checkDuplicateBtn').addEventListener('click', async () => {
                    const fileInput = document.getElementById('csvFile');
                    if (!fileInput.files[0]) {
                        alert('Please select a CSV file first.');
                        return;
                    }

                    const formData = new FormData();
                    formData.append('file', fileInput.files[0]);

                    const checkBtn = document.getElementById('checkDuplicateBtn');
                    const resultsDiv = document.getElementById('duplicateResults');
                    const listDiv = document.getElementById('duplicateList');
                    
                    checkBtn.disabled = true;
                    checkBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    resultsDiv.classList.add('hidden');
                    listDiv.innerHTML = '';

                    try {
                        const response = await fetch('/check-duplicates', {
                            method: 'POST',
                            body: formData
                        });
                        
                        if (response.ok) {
                            const data = await response.json();
                            if (data.duplicateCount > 0) {
                                resultsDiv.classList.remove('hidden');
                                listDiv.innerHTML = data.duplicates.map(d => 
                                    \`<div class="flex justify-between border-b border-amber-200/50 dark:border-amber-800/50 py-1 last:border-0">
                                        <span>Row \${d.row}: <b>\${d.barcode}</b></span>
                                        <span>\${d.name}</span>
                                    </div>\`
                                ).join('');
                            } else {
                                alert('No duplicate barcodes found! Your data is clean.');
                            }
                        } else {
                            const text = await response.text();
                            alert('Error: ' + text);
                        }
                    } catch (err) {
                        alert('Error checking duplicates: ' + err.message);
                    } finally {
                        checkBtn.disabled = false;
                        checkBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    }
                });

                document.getElementById('uploadForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const fileInput = document.getElementById('csvFile');
                    if (!fileInput.files[0]) return;

                    const formData = new FormData();
                    formData.append('file', fileInput.files[0]);
                    
                    const headerInput = document.getElementById('headerImage');
                    if (headerInput.files[0]) {
                        formData.append('headerImage', headerInput.files[0]);
                    }

                    formData.append('senderFrom', document.getElementById('senderFrom').value);
                    formData.append('senderMobile', document.getElementById('senderMobile').value);
                    formData.append('senderAddress', document.getElementById('senderAddress').value);

                    const loader = document.getElementById('loader');
                    const progressDiv = document.getElementById('progress');
                    const resultContainer = document.getElementById('resultContainer');
                    const iframe = document.getElementById('result');
                    const btn = e.target.querySelector('button[type="submit"]');
                    const cancelBtn = document.getElementById('cancelBtn');
                    
                    loader.classList.remove('hidden');
                    document.getElementById('loaderText').innerText = 'Generating PDF, please wait...';
                    progressDiv.innerText = '';
                    resultContainer.classList.add('hidden');
                    iframe.src = '';
                    
                    btn.disabled = true;
                    btn.classList.add('opacity-50', 'cursor-not-allowed');
                    cancelBtn.classList.remove('hidden');
                    cancelBtn.classList.add('flex');
                    cancelBtn.disabled = false;
                    cancelBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    cancelBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg> Stop & Show';

                    try {
                        const response = await fetch('/generate-pdfs', {
                            method: 'POST',
                            body: formData
                        });
                        
                        if (response.ok) {
                            const data = await response.json();
                            if (data.jobId) {
                                currentJobId = data.jobId;
                                startPolling();
                            } else {
                                alert('Failed to get Job ID');
                                resetUI();
                            }
                        } else {
                            const text = await response.text();
                            alert('Error: ' + text);
                            resetUI();
                        }
                    } catch (err) {
                        alert('Error starting generation: ' + err.message);
                        resetUI();
                    }
                });

                document.getElementById('cancelBtn').addEventListener('click', async () => {
                    if (!currentJobId) return;
                    const btn = document.getElementById('cancelBtn');
                    btn.disabled = true;
                    btn.classList.add('opacity-50', 'cursor-not-allowed');
                    btn.innerHTML = 'Stopping...';
                    document.getElementById('loaderText').innerText = 'Stopping generator, getting PDF ready...';
                    
                    try {
                        await fetch('/cancel/' + currentJobId, { method: 'POST' });
                    } catch (err) {
                        console.error('Cancel failed', err);
                    }
                });

                function startPolling() {
                    pollInterval = setInterval(async () => {
                        if (!currentJobId) {
                            clearInterval(pollInterval);
                            return;
                        }
                        try {
                            const res = await fetch('/status/' + currentJobId);
                            if (res.ok) {
                                const job = await res.json();
                                
                                const progressDiv = document.getElementById('progress');
                                if (job.total > 0) {
                                    progressDiv.innerText = job.status + ' (' + job.progress + ' / ' + job.total + ' rows processed)';
                                } else {
                                    progressDiv.innerText = job.status;
                                }

                                if (job.done) {
                                    clearInterval(pollInterval);
                                    if (job.error) {
                                        alert('Error: ' + job.error);
                                    } else if (job.resultPdfUrl) {
                                        progressDiv.innerText = 'Generation Complete: ' + job.pagesGenerated + ' pages generated successfully!';
                                        document.getElementById('loader').classList.add('bg-green-50', 'dark:bg-green-900/20', 'border-green-200', 'dark:border-green-800/50');
                                        document.getElementById('loader').classList.remove('bg-indigo-50', 'dark:bg-indigo-900/20', 'border-indigo-100', 'dark:border-indigo-800/50');
                                        document.getElementById('loaderText').classList.add('text-green-700', 'dark:text-green-400');
                                        document.getElementById('loaderText').classList.remove('text-indigo-700', 'dark:text-indigo-300');
                                        progressDiv.classList.add('text-green-600', 'dark:text-green-500');
                                        progressDiv.classList.remove('text-indigo-600/80', 'dark:text-indigo-400/80');
                                        
                                        const iframe = document.getElementById('result');
                                        const resultContainer = document.getElementById('resultContainer');
                                        iframe.src = job.resultPdfUrl;
                                        resultContainer.classList.remove('hidden');
                                    }
                                    resetUI(true);
                                }
                            }
                        } catch (err) {
                            console.error('Polling error', err);
                        }
                    }, 1000);
                }

                function resetUI(keepLoader = false) {
                    if(!keepLoader) document.getElementById('loader').classList.add('hidden');
                    const submitBtn = document.getElementById('uploadForm').querySelector('button[type="submit"]');
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    
                    const cancelBtn = document.getElementById('cancelBtn');
                    cancelBtn.classList.add('hidden');
                    cancelBtn.classList.remove('flex');
                    cancelBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg> Stop & Show';
                    
                    // Reset loader style for next run if it was green
                    setTimeout(() => {
                        if(keepLoader) {
                            const loaderEl = document.getElementById('loader');
                            if(loaderEl) {
                                loaderEl.classList.remove('bg-green-50', 'dark:bg-green-900/20', 'border-green-200', 'dark:border-green-800/50');
                                loaderEl.classList.add('bg-indigo-50', 'dark:bg-indigo-900/20', 'border-indigo-100', 'dark:border-indigo-800/50');
                                document.getElementById('loaderText').classList.remove('text-green-700', 'dark:text-green-400');
                                document.getElementById('loaderText').classList.add('text-indigo-700', 'dark:text-indigo-300');
                                document.getElementById('progress').classList.remove('text-green-600', 'dark:text-green-500');
                                document.getElementById('progress').classList.add('text-indigo-600/80', 'dark:text-indigo-400/80');
                            }
                        }
                    }, 2000);
                    
                    currentJobId = null;
                }
            </script>
        </body>
        </html>
    `);
});

// Serve generated PDFs
app.use('/generated-pdfs', express.static(path.join(__dirname, 'generated-pdfs')));


async function generateBarcodeBase64(id) {
    const png = await bwipjs.toBuffer({
        bcid: 'code128',
        text: id,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center'
    });
    return `data:image/png;base64,${png.toString('base64')}`;
}

async function processCSVAndGeneratePDFs(filePath, headerImagePath, originalFileName, jobId, senderInfo) {
    const rows = [];

    return new Promise((resolve, reject) => {
        let headersProcessed = false;

        fs.createReadStream(filePath)
            .pipe(csv({
                mapHeaders: ({ header }) => header.trim().replace(/^\ufeff/, ''), // Strip BOM and trim
                separator: ',' // Default, but we can't easily auto-detect inside pipe easily without pre-reading
            }))
            .on('data', (row) => rows.push(row))
            .on('end', async () => {
                try {
                    const envelopesData = [];
                    if (jobs[jobId]) {
                        jobs[jobId].total = rows.length;
                        jobs[jobId].status = 'Processing rows...';
                    }

                    for (const row of rows) {
                        if (jobs[jobId] && jobs[jobId].isCancelled) break;

                        try {
                            const pdfUrl = row['PDF_URL'];
                            
                            const findValue = (obj, variations) => {
                                const keys = Object.keys(obj);
                                if (!headersProcessed) {
                                    console.log("Job", jobId, "detected keys:", keys);
                                    headersProcessed = true;
                                }
                                // 1. Try exact matches first
                                for (const v of variations) {
                                    if (obj[v]) return obj[v];
                                }
                                // 2. Try normalized matches
                                for (const v of variations) {
                                    const match = keys.find(k => k.toLowerCase().replace(/[^a-z]/g, '') === v.toLowerCase().replace(/[^a-z]/g, ''));
                                    if (match && obj[match]) return obj[match];
                                }
                                return '';
                            };

                            const lan = findValue(row, ['barcode', 'LAN', 'id', 'application_no', 'loan_no', 'applicationno']) || 'UNKNOWN';
                            let name = findValue(row, ['name', 'borrower name', 'customer name', 'applicant name', 'full name', 'borrower', 'customer', 'applicant', 'recipient']);
                            let address = findValue(row, ['address', 'applicant address', 'customer address', 'full address', 'residence address', 'location']);
                            let phone = findValue(row, ['mobile number', 'phone', 'mobile', 'applicant mobile', 'customer mobile', 'contact', 'phoneno']);

                            if (pdfUrl) {
                                console.log(`Parsing PDF for LAN: ${lan}`);
                                const extracted = await parseEnvelopeDataFromPdf(pdfUrl);
                                name = extracted.name || name;
                                address = extracted.address || address;
                                phone = extracted.phone || phone;
                            }

                            const barcodeBase64 = await generateBarcodeBase64(lan);

                            envelopesData.push({
                                name: name,
                                address: address,
                                phone: phone,
                                barcode: barcodeBase64,
                                lan: lan
                            });

                            if (jobs[jobId]) jobs[jobId].progress = envelopesData.length;
                        } catch (err) {
                            console.error(`Error processing row ${row['LAN'] || row['id']}:`, err.message);
                        }
                    }

                    fs.unlink(filePath, (err) => {
                        if (err) console.error('Failed to delete uploaded file:', err);
                    });

                    if (envelopesData.length > 0) {
                        if (jobs[jobId]) jobs[jobId].status = 'Generating final PDF document...';
                        const mergedPdfName = await generateMergedPdf(envelopesData, headerImagePath, originalFileName, senderInfo);
                        const folderName = originalFileName.split('.')[0];
                        if (jobs[jobId]) {
                            jobs[jobId].resultPdfUrl = `/generated-pdfs/${folderName}/${mergedPdfName}`;
                            jobs[jobId].pagesGenerated = envelopesData.length;
                            jobs[jobId].done = true;
                        }
                        resolve(mergedPdfName);
                    } else {
                        if (jobs[jobId]) {
                            jobs[jobId].error = 'No valid rows processed.';
                            jobs[jobId].done = true;
                        }
                        reject(new Error('No valid rows processed.'));
                    }
                } catch (err) {
                    if (jobs[jobId]) {
                        jobs[jobId].error = err.message;
                        jobs[jobId].done = true;
                    }
                    reject(err);
                }
            })
            .on('error', (err) => {
                if (jobs[jobId]) {
                    jobs[jobId].error = err.message;
                    jobs[jobId].done = true;
                }
                reject(err);
            });
    });
}


const { PDFDocument } = require('pdf-lib');

async function generateMergedPdf(envelopesData, headerImagePath, filename, senderInfo) {
    const templatePath = path.join(__dirname, 'templates', `cover_template.ejs`);
    const BATCH_SIZE = 50;

    // Read logo image and convert to base64
    let logoDataUri = '';
    if (headerImagePath && fs.existsSync(headerImagePath)) {
        const logoBase64 = fs.readFileSync(headerImagePath).toString('base64');
        logoDataUri = `data:image/png;base64,${logoBase64}`;
    }

    const outputDir = path.join(__dirname, 'generated-pdfs', filename.split('.')[0]);
    fs.mkdirSync(outputDir, { recursive: true });

    const mergedFileName = `merged_${Date.now()}.pdf`;
    const pdfPath = path.join(outputDir, mergedFileName);

    const browser = await getBrowser();

    try {
        const mergedPdf = await PDFDocument.create();

        for (let i = 0; i < envelopesData.length; i += BATCH_SIZE) {
            const batch = envelopesData.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(envelopesData.length / BATCH_SIZE)}...`);

            const html = await ejs.renderFile(templatePath, { envelopes: batch, logoDataUri: logoDataUri, sender: senderInfo });
            const page = await browser.newPage();

            try {
                await page.setContent(html, { waitUntil: 'load', timeout: 120000 });
                const pdfBuffer = await page.pdf({
                    width: '220mm',
                    height: '110mm',
                    printBackground: true,
                    margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' }
                });

                const batchPdf = await PDFDocument.load(pdfBuffer);
                const copiedPages = await mergedPdf.copyPages(batchPdf, batchPdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            } finally {
                await page.close();
            }
        }

        const mergedPdfBytes = await mergedPdf.save();
        fs.writeFileSync(pdfPath, mergedPdfBytes);
        console.log(`Successfully generated merged PDF: ${mergedFileName}`);
        return mergedFileName;

    } catch (err) {
        console.error("Error generating PDF:", err);
        throw err;
    }
}

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

module.exports = app;


