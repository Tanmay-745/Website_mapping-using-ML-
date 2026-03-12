import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

// Load .env file
const envPath = path.resolve(process.cwd(), '.env');
let envVars = {};
let sharedData = null; // Store shared data in memory

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        // Basic .env parsing
        const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            // Remove quotes if present
            if (value.length > 0 && (value.startsWith('"') || value.startsWith("'"))) {
                value = value.slice(1, -1);
            }
            envVars[key] = value;
        }
    });
}

const APA_KEY = envVars.OPENAI_API_KEY || process.env.OPENAI_API_KEY;

if (!APA_KEY) {
    console.error("Warning: OPENAI_API_KEY not found in .env or environment variables.");
} else {
    console.log("OPENAI_API_KEY loaded successfully.");
}

const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const host = req.headers.host;
    const url = new URL(req.url, `http://${host}`);
    console.log(`${req.method} ${url.pathname}`);

    if (url.pathname === '/functions/v1/server/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: "ok" }));
        return;
    }

    // --- Data Sharing Endpoints ---
    if (url.pathname === '/api/share-data' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                sharedData = JSON.parse(body);
                console.log("Data shared successfully:", Object.keys(sharedData));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                console.error("Failed to parse shared data", e);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
        });
        return;
    }

    if (url.pathname === '/api/share-data' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sharedData || {}));
        return;
    }

    // --- Advocates Persistence ---
    const ADVOCATES_FILE = path.join(process.cwd(), 'advocates.json');

    if (url.pathname === '/api/advocates' && req.method === 'GET') {
        try {
            if (fs.existsSync(ADVOCATES_FILE)) {
                let data = fs.readFileSync(ADVOCATES_FILE, 'utf8');
                let advocates = [];
                try {
                    advocates = JSON.parse(data);
                } catch (err) {
                    console.error("Error parsing advocates, resetting to empty array", err);
                    advocates = [];
                }

                let modified = false;
                advocates = advocates.map((a, index) => {
                    if (!a.id) {
                        a.id = Date.now().toString() + "-" + index;
                        modified = true;
                    }
                    // Ensure ID is a string
                    if (typeof a.id !== 'string') {
                        a.id = String(a.id);
                        modified = true;
                    }
                    return a;
                });

                if (modified) {
                    console.log("Self-healing: Assigned missing/fixed IDs to advocates.");
                    fs.writeFileSync(ADVOCATES_FILE, JSON.stringify(advocates, null, 2));
                    data = JSON.stringify(advocates, null, 2);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify([]));
            }
        } catch (e) {
            console.error("Failed to read advocates file", e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
        return;
    }

    if (url.pathname === '/api/advocates' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const advocateData = JSON.parse(body);
                let advocates = [];
                if (fs.existsSync(ADVOCATES_FILE)) {
                    try {
                        advocates = JSON.parse(fs.readFileSync(ADVOCATES_FILE, 'utf8'));
                    } catch (err) {
                        advocates = [];
                    }
                }

                if (advocateData.id) {
                    // Update existing
                    const index = advocates.findIndex(a => a.id == advocateData.id);
                    if (index !== -1) {
                        advocates[index] = { ...advocates[index], ...advocateData };
                        console.log("Advocate updated:", advocateData.name);
                    } else {
                        // ID provided but not found? Treat as new or error? Treat as new with that ID.
                        advocates.push(advocateData);
                        console.log("Advocate created with provided ID:", advocateData.name);
                    }
                } else {
                    // Create new
                    advocateData.id = Date.now().toString();
                    advocates.push(advocateData);
                    console.log("Advocate created:", advocateData.name);
                }

                fs.writeFileSync(ADVOCATES_FILE, JSON.stringify(advocates, null, 2));

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, advocate: advocateData }));
            } catch (e) {
                console.error("Failed to save advocate", e);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Invalid JSON or Server Error" }));
            }
        });
        return;
    }

    if (url.pathname === '/api/advocates' && req.method === 'DELETE') {
        const id = url.searchParams.get('id');
        if (!id) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Missing ID" }));
            return;
        }

        try {
            if (fs.existsSync(ADVOCATES_FILE)) {
                let advocates = [];
                try {
                    advocates = JSON.parse(fs.readFileSync(ADVOCATES_FILE, 'utf8'));
                } catch (err) { advocates = []; }

                const originalLength = advocates.length;

                // Robust deletion logic
                const initialCount = advocates.length;
                advocates = advocates.filter(a => {
                    const match = String(a.id).trim() == String(id).trim();
                    if (match) {
                        console.log(`Deleting advocate match found: File ID '${a.id}' matches Request ID '${id}'`);
                    }
                    return !match;
                });

                if (advocates.length !== originalLength) {
                    fs.writeFileSync(ADVOCATES_FILE, JSON.stringify(advocates, null, 2));
                    console.log("Advocate deleted successfully. Count reduced from", initialCount, "to", advocates.length);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Advocate not found" }));
                }
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "No advocates found" }));
            }
        } catch (e) {
            console.error("Failed to delete advocate", e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
        return;
    }

    // --- Notice Types Persistence ---
    const NOTICE_TYPES_FILE = path.join(process.cwd(), 'notice_types.json');

    if (url.pathname === '/api/notice-types' && req.method === 'GET') {
        try {
            if (fs.existsSync(NOTICE_TYPES_FILE)) {
                const data = fs.readFileSync(NOTICE_TYPES_FILE, 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
            } else {
                // Return defaults if file doesn't exist
                const defaults = [
                    { id: "LRN", title: "Legal Recovery Notice (LRN)", description: "Formal notice for initiating legal recovery proceedings for outstanding dues", icon: "FileText", color: "blue" },
                    { id: "LDN", title: "Legal Demand Notice (LDN)", description: "Demand notice requiring immediate payment or action from the recipient", icon: "AlertCircle", color: "red" },
                    { id: "OTS", title: "One Time Settlement (OTS)", description: "Settlement offer for resolving outstanding dues with a one-time payment", icon: "DollarSign", color: "green" },
                    { id: "Overdue", title: "Overdue Notice", description: "Reminder notice for overdue payments with penalty information", icon: "Clock", color: "orange" }
                ];
                fs.writeFileSync(NOTICE_TYPES_FILE, JSON.stringify(defaults, null, 2));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(defaults));
            }
        } catch (e) {
            console.error("Failed to read notice types", e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
        return;
    }

    if (url.pathname === '/api/notice-types' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const newType = JSON.parse(body);
                let types = [];
                if (fs.existsSync(NOTICE_TYPES_FILE)) {
                    types = JSON.parse(fs.readFileSync(NOTICE_TYPES_FILE, 'utf8'));
                }
                
                // Ensure unique ID
                if (!newType.id) {
                    newType.id = newType.title.replace(/\s+/g, '-').toLowerCase();
                }
                
                // Add default icon and color if missing
                if (!newType.icon) newType.icon = "FileText";
                if (!newType.color) newType.color = "blue";

                types.push(newType);
                fs.writeFileSync(NOTICE_TYPES_FILE, JSON.stringify(types, null, 2));

                console.log("Notice type created:", newType.title);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, noticeType: newType }));
            } catch (e) {
                console.error("Failed to save notice type", e);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Invalid JSON or Server Error" }));
            }
        });
        return;
    }

    // --- Template Discovery & Analysis (Non-LLM) ---
    const NOTICE_FOLDER = path.join(process.cwd(), 'Notice folder');

    if (url.pathname === '/api/templates/search' && req.method === 'GET') {
        const query = url.searchParams.get('query') || '';
        const lender = url.searchParams.get('lender') || '';
        const type = url.searchParams.get('type') || '';

        try {
            if (fs.existsSync(NOTICE_FOLDER)) {
                const templates = fs.readdirSync(NOTICE_FOLDER)
                    .filter(f => f.endsWith('.docx') && !f.includes('- Copy'));

                let bestMatch = null;

                // 1. Try exact Lender_Type match
                if (lender && type) {
                    const exactMatch = templates.find(f =>
                        f.toLowerCase() === `${lender.toLowerCase()}_${type.toLowerCase()}.docx`
                    );
                    if (exactMatch) bestMatch = exactMatch;
                }

                // 2. Try Type match if no exact match found
                if (!bestMatch && type) {
                    const typeMatch = templates.find(f =>
                        f.toLowerCase().includes(type.toLowerCase())
                    );
                    if (typeMatch) bestMatch = typeMatch;
                }

                // 3. Fallback to general query search if still nothing or no specific params
                if (!bestMatch && query) {
                    bestMatch = templates.find(f =>
                        f.toLowerCase().includes(query.toLowerCase())
                    );
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(bestMatch ? [bestMatch] : []));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Notice folder not found" }));
            }
        } catch (e) {
            console.error("Search failed", e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "Search failed" }));
        }
        return;
    }

    if (url.pathname === '/api/templates/analyze' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { templateName } = JSON.parse(body);
                const filePath = path.join(NOTICE_FOLDER, templateName);

                if (fs.existsSync(filePath)) {
                    const result = await mammoth.extractRawText({ path: filePath });
                    const text = result.value;

                    // Regex to find all occurrences of ${variable_name}
                    const pattern = /\$\{([^}]+)\}/g;
                    let matches = [];
                    let match;
                    while ((match = pattern.exec(text)) !== null) {
                        matches.push(match[1]);
                    }

                    const uniquePlaceholders = [...new Set(matches)].sort();

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        templateName,
                        placeholders: uniquePlaceholders
                    }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Template not found" }));
                }
            } catch (e) {
                console.error("Analysis failed", e);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Analysis failed" }));
            }
        });
        return;
    }

    if (url.pathname === '/api/templates/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { lender, type, content } = JSON.parse(body);
                if (!lender || !type || !content) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Missing required fields" }));
                    return;
                }

                const fileName = `${lender}_${type}.docx`;
                const filePath = path.join(NOTICE_FOLDER, fileName);

                // For now saving as HTML-styled text in a .docx named file
                // Note: True .docx generation would require a library like docx
                fs.writeFileSync(filePath, content);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, fileName }));
            } catch (e) {
                console.error("Save failed", e);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Save failed" }));
            }
        });
        return;
    }

    if (url.pathname.startsWith('/api/templates/file/') && req.method === 'GET') {
        const fileName = url.pathname.replace('/api/templates/file/', '');
        const filePath = path.join(NOTICE_FOLDER, fileName);

        try {
            if (fs.existsSync(filePath)) {
                if (fileName.toLowerCase().endsWith('.docx')) {
                    const result = await mammoth.convertToHtml({ path: filePath });
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(result.value);
                } else {
                    const content = fs.readFileSync(filePath, 'utf8');
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(content);
                }
            } else {
                res.writeHead(404);
                res.end("Not found");
            }
        } catch (e) {
            console.error("Error reading template file", e);
            res.writeHead(500);
            res.end("Error reading file");
        }
        return;
    }
    // --- ML Mapping Endpoints ---
    if (url.pathname === '/api/ml/map-variables' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const mlPayload = body;
                const mlReq = http.request({
                    hostname: 'localhost',
                    port: 8000,
                    path: '/map',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(mlPayload)
                    }
                }, (mlRes) => {
                    let data = '';
                    mlRes.on('data', chunk => data += chunk);
                    mlRes.on('end', () => {
                        res.writeHead(mlRes.statusCode, { 'Content-Type': 'application/json' });
                        res.end(data);
                    });
                });

                mlReq.on('error', (e) => {
                    console.error("ML service connection error:", e);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "ML mapping service not running on port 8000" }));
                });

                mlReq.write(mlPayload);
                mlReq.end();
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
        });
        return;
    }
    // -----------------------------

    if (url.pathname === '/functions/v1/server/api/generate' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                if (!body) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Empty body" }));
                    return;
                }
                const { prompt, context, apiKey } = JSON.parse(body);

                // LOCAL ML IMPLEMENTATION (RAG)
                console.log(`Processing request using Local ML RAG`);

                const mlPayload = JSON.stringify({
                    prompt: prompt,
                    context: context
                });

                const mlReq = http.request({
                    hostname: 'localhost',
                    port: 8000,
                    path: '/generate-notice',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(mlPayload)
                    }
                }, (mlRes) => {
                    let data = '';
                    mlRes.on('data', chunk => data += chunk);
                    mlRes.on('end', () => {
                        if (mlRes.statusCode >= 200 && mlRes.statusCode < 300) {
                            try {
                                const responseData = JSON.parse(data);
                                // The Python service returns { result: "...", source_template: "..." }
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ 
                                    result: responseData.result,
                                    source: responseData.source_template 
                                }));
                            } catch (e) {
                                console.error("ML Parse Error", e);
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: "Failed to parse local ML response" }));
                            }
                        } else {
                            console.error("ML Service Error", data);
                            res.writeHead(mlRes.statusCode, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: `ML Service Error: ${mlRes.statusMessage}` }));
                        }
                    });
                });

                mlReq.on('error', (e) => {
                    console.error("Local ML Connection Error:", e);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: "Could not connect to Local ML service on port 8000. Is it running?",
                        details: e.message
                    }));
                });

                mlReq.write(mlPayload);
                mlReq.end();

            } catch (parseError) {
                console.error("Error parsing request body:", parseError);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Invalid JSON body" }));
            }
        });
    } else {
        // Fallback 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

const PORT = 54321;
server.listen(PORT, () => {
    console.log(`Local AI Proxy Server running on http://localhost:${PORT}`);
    console.log(`- Health check: http://localhost:${PORT}/functions/v1/server/health`);
    console.log(`- Generate API: http://localhost:${PORT}/functions/v1/server/api/generate`);
});
