import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 54321;
const ML_BACKEND_PORT = 8001;
const TRANSLATOR_PORT = 8000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// In-memory store for shared data
let sharedData = {
    headers: [],
    sampleData: [],
    deliveryMode: 'digital',
    timestamp: null
};

// --- Health Check ---
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/functions/v1/server/health', (req, res) => res.json({ status: 'ok' }));

// --- Share Data Endpoints ---
app.post('/api/share-data', (req, res) => {
    sharedData = {
        ...req.body,
        timestamp: Date.now()
    };
    console.log('Data shared successfully');
    res.json({ success: true });
});

app.get('/api/share-data', (req, res) => {
    res.json(sharedData);
});

// --- Advocate Management ---
const ADVOCATES_FILE = path.join(__dirname, 'advocates.json');

app.get('/api/advocates', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(ADVOCATES_FILE, 'utf8'));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read advocates' });
    }
});

app.post('/api/advocates', (req, res) => {
    try {
        const advocates = JSON.parse(fs.readFileSync(ADVOCATES_FILE, 'utf8'));
        const advocateData = req.body;
        
        let existingIndex = -1;
        if (advocateData.id) {
            existingIndex = advocates.findIndex(a => String(a.id) === String(advocateData.id));
        }

        if (existingIndex > -1) {
            // Update existing
            advocates[existingIndex] = { ...advocates[existingIndex], ...advocateData };
            fs.writeFileSync(ADVOCATES_FILE, JSON.stringify(advocates, null, 2));
            res.json({ success: true, advocate: advocates[existingIndex] });
        } else {
            // Create new
            const newAdvocate = { ...advocateData, id: Date.now().toString() };
            advocates.push(newAdvocate);
            fs.writeFileSync(ADVOCATES_FILE, JSON.stringify(advocates, null, 2));
            res.json({ success: true, advocate: newAdvocate });
        }
    } catch (err) {
        console.error('Error in POST /api/advocates:', err);
        res.status(500).json({ error: 'Failed to save advocate' });
    }
});

app.delete('/api/advocates', (req, res) => {
    const { id } = req.query;
    try {
        let advocates = JSON.parse(fs.readFileSync(ADVOCATES_FILE, 'utf8'));
        advocates = advocates.filter(a => String(a.id) !== String(id) && String(a.name) !== String(id));
        fs.writeFileSync(ADVOCATES_FILE, JSON.stringify(advocates, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete advocate' });
    }
});

// --- Lender Management ---
const LENDERS_FILE = path.join(__dirname, 'lenders.json');
if (!fs.existsSync(LENDERS_FILE)) fs.writeFileSync(LENDERS_FILE, '[]');

app.get('/api/lenders', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(LENDERS_FILE, 'utf8'));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read lenders' });
    }
});

app.post('/api/lenders', (req, res) => {
    try {
        const lenders = JSON.parse(fs.readFileSync(LENDERS_FILE, 'utf8'));
        const newLender = { ...req.body, id: `lender_${Date.now()}` };
        lenders.push(newLender);
        fs.writeFileSync(LENDERS_FILE, JSON.stringify(lenders, null, 2));
        res.json({ success: true, lender: newLender });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save lender' });
    }
});

app.delete('/api/lenders', (req, res) => {
    const { id } = req.query;
    try {
        let lenders = JSON.parse(fs.readFileSync(LENDERS_FILE, 'utf8'));
        lenders = lenders.filter(l => l.id !== id);
        fs.writeFileSync(LENDERS_FILE, JSON.stringify(lenders, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete lender' });
    }
});

// --- Notice Types Management ---
const NOTICE_TYPES_FILE = path.join(__dirname, 'notice_types.json');

app.get('/api/notice-types', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(NOTICE_TYPES_FILE, 'utf8'));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read notice types' });
    }
});

app.post('/api/notice-types', (req, res) => {
    try {
        const types = JSON.parse(fs.readFileSync(NOTICE_TYPES_FILE, 'utf8'));
        const newType = { ...req.body, id: `type_${Date.now()}` };
        types.push(newType);
        fs.writeFileSync(NOTICE_TYPES_FILE, JSON.stringify(types, null, 2));
        res.json({ success: true, noticeType: newType });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save notice type' });
    }
});

// --- Template Management ---
const TEMPLATES_DIR = path.join(__dirname, 'Notice folder');
if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR);

app.get('/api/templates/search', (req, res) => {
    const { lender, type } = req.query;
    try {
        const files = fs.readdirSync(TEMPLATES_DIR);
        const matches = files.filter(f => 
            f.toLowerCase().includes((lender || '').toLowerCase()) || 
            f.toLowerCase().includes((type || '').toLowerCase())
        );
        res.json(matches);
    } catch (err) {
        res.status(500).json({ error: 'Search failed' });
    }
});

app.post('/api/templates/save', (req, res) => {
    const { lender, type, content } = req.body;
    const filename = `${(lender || 'template').replace(/\s+/g, '_')}_${(type || 'notice').replace(/\s+/g, '_')}_${Date.now()}.html`;
    try {
        fs.writeFileSync(path.join(TEMPLATES_DIR, filename), content);
        res.json({ success: true, filename });
    } catch (err) {
        res.status(500).json({ error: 'Save failed' });
    }
});

app.post('/api/templates/analyze', (req, res) => {
    const { templateName } = req.body;
    try {
        const filePath = path.join(TEMPLATES_DIR, templateName);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Template not found' });
        }
        const content = fs.readFileSync(filePath, 'utf8');
        const regex = /\[\[(.*?)\]\]/g;
        const matches = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            matches.push(match[1]);
        }
        res.json({ placeholders: [...new Set(matches)] });
    } catch (err) {
        res.status(500).json({ error: 'Analysis failed' });
    }
});

// --- ML Mapping Proxy ---
app.post('/api/ml/map-variables', (req, res) => {
    const options = {
        hostname: 'localhost',
        port: ML_BACKEND_PORT,
        path: '/api/map-columns',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => data += chunk);
        proxyRes.on('end', () => {
            try {
                res.json(JSON.parse(data));
            } catch (e) {
                res.status(500).json({ error: 'Failed to parse ML response' });
            }
        });
    });

    proxyReq.on('error', (err) => {
        console.error('Proxy error:', err);
        res.status(502).json({ error: 'ML Service unavailable' });
    });

    proxyReq.write(JSON.stringify({
        columns: req.body.source_columns
    }));
    proxyReq.end();
});

// --- Translation Proxy ---
app.post('/api/translate', (req, res) => {
    const options = {
        hostname: 'localhost',
        port: TRANSLATOR_PORT,
        path: '/translate',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => data += chunk);
        proxyRes.on('end', () => {
            try {
                res.json(JSON.parse(data));
            } catch (e) {
                res.status(500).json({ error: 'Failed to parse translation response' });
            }
        });
    });

    proxyReq.on('error', (err) => {
        console.error('Proxy error:', err);
        res.status(502).json({ error: 'Translation Service unavailable' });
    });

    const body = { 
        text: req.body.text, 
        dest: req.body.target_lang || req.body.dest 
    };
    proxyReq.write(JSON.stringify(body));
    proxyReq.end();
});

// --- OpenAI Proxy ---
app.post(['/api/generate', '/functions/v1/server/api/generate'], async (req, res) => {
    const { prompt, context, apiKey } = req.body;
    const OPENAI_API_KEY = apiKey || process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
        return res.status(400).json({ error: 'OpenAI API Key not configured' });
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert legal assistant specializing in drafting Indian legal notices. Output professional, legally precise HTML.'
                    },
                    {
                        role: 'user',
                        content: `Context: ${JSON.stringify(context)}\n\nTask: ${prompt}`
                    }
                ]
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        
        let result = data.choices[0].message.content;
        result = result.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
        
        res.json({ result });
    } catch (error) {
        console.error('Generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Unified Backend Server running at http://localhost:${PORT}`);
});
