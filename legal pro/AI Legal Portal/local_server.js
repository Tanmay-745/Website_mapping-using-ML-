import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';

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

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
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

                // Determine Provider
                const provider = envVars.AI_PROVIDER || process.env.AI_PROVIDER || 'openai';
                const model = envVars.OLLAMA_MODEL || process.env.OLLAMA_MODEL || 'mistral';

                console.log(`Processing request using provider: ${provider}`);

                if (provider === 'ollama') {
                    // OLLAMA IMPLEMENTATION
                    const ollamaPayload = JSON.stringify({
                        model: model,
                        messages: [
                            {
                                role: "system",
                                content: "You are an expert legal assistant specializing in drafting Indian legal notices. Output ONLY valid HTML content suitable for a rich text editor. Do not use markdown code blocks."
                            },
                            {
                                role: "user",
                                content: `Context: ${JSON.stringify(context)}\n\nTask: ${prompt}`
                            }
                        ],
                        stream: false
                    });

                    const ollamaReq = http.request({
                        hostname: 'localhost',
                        port: 11434,
                        path: '/api/chat',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(ollamaPayload)
                        }
                    }, (ollamaRes) => {
                        let data = '';
                        ollamaRes.on('data', chunk => data += chunk);
                        ollamaRes.on('end', () => {
                            if (ollamaRes.statusCode >= 200 && ollamaRes.statusCode < 300) {
                                try {
                                    const responseData = JSON.parse(data);
                                    let content = responseData.message?.content || "";
                                    // Clean up markdown
                                    content = content.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');

                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ result: content }));
                                } catch (e) {
                                    console.error("Ollama Parse Error", e);
                                    res.writeHead(500, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ error: "Failed to parse Ollama response" }));
                                }
                            } else {
                                console.error("Ollama Error", data);
                                res.writeHead(ollamaRes.statusCode, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: `Ollama Error: ${ollamaRes.statusMessage}` }));
                            }
                        });
                    });

                    ollamaReq.on('error', (e) => {
                        console.error("Ollama Connection Error:", e);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            error: "Could not connect to Ollama. Make sure it is running!",
                            details: e.message
                        }));
                    });

                    ollamaReq.write(ollamaPayload);
                    ollamaReq.end();
                    return;

                }

                // OPENAI IMPLEMENTATION (Default)
                const apiKeyToUse = apiKey || APA_KEY;

                if (!apiKeyToUse) {
                    console.error("Missing OpenAI API Key");
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "OpenAI API Key not configured" }));
                    return;
                }

                const openAiPayload = JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "system",
                            content: "You are an expert legal assistant specializing in drafting Indian legal notices (LRN, LDN, OTS, etc.). Your output should be professional, legally precise, and formatted in HTML (using tags like <p>, <h3>, <ul>, <strong>, etc.) suitable for a rich text editor. Do not wrap the output in markdown code blocks."
                        },
                        {
                            role: "user",
                            content: `Context: ${JSON.stringify(context)}\n\nTask: ${prompt}`
                        }
                    ],
                    temperature: 0.7,
                });

                const openAiReq = https.request('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKeyToUse}`,
                        'Content-Length': Buffer.byteLength(openAiPayload)
                    }
                }, (openAiRes) => {
                    let data = '';
                    openAiRes.on('data', (chunk) => data += chunk);
                    openAiRes.on('end', () => {
                        if (openAiRes.statusCode >= 200 && openAiRes.statusCode < 300) {
                            try {
                                const responseData = JSON.parse(data);
                                let content = responseData.choices[0].message.content;
                                // Clean up markdown code blocks if present
                                if (content) {
                                    content = content.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
                                }

                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ result: content }));
                            } catch (parseError) {
                                console.error("Error parsing OpenAI response:", parseError);
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: "Failed to parse OpenAI response: " + parseError.message }));
                            }
                        } else {
                            console.error("OpenAI API Error:", data);
                            res.writeHead(openAiRes.statusCode, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: `OpenAI API Error: ${openAiRes.statusMessage}`, details: data }));
                        }
                    });
                });

                openAiReq.on('error', (e) => {
                    console.error("Request to OpenAI failed:", e);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Request to OpenAI failed: " + e.message }));
                });

                openAiReq.write(openAiPayload);
                openAiReq.end();

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
