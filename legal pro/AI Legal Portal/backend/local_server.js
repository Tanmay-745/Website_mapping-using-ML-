import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Very lightweight .env loader (since dotenv isn't installed)
try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=:]+?)[=:](.*)/);
            if (match) {
                const key = match[1].trim();
                const val = match[2].trim().replace(/(^['"]|['"]$)/g, '');
                process.env[key] = process.env[key] || val;
            }
        });
    }
} catch (e) {
    console.error("Could not load .env file", e);
}

const app = express();
const PORT = 54321;
const ML_BACKEND_PORT = 8003;
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
app.post(['/api/ml/map-variables', '/map'], (req, res) => {
    const options = {
        hostname: 'localhost',
        port: ML_BACKEND_PORT,
        path: '/map', // Sync with Python endpoint
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
        source_columns: req.body.source_columns || req.body.placeholders,
        placeholders: req.body.placeholders || req.body.source_columns
    }));
    proxyReq.end();
});

// --- Translation via Gemini API ---
app.post('/api/translate', async (req, res) => {
    const { text, target_lang, dest, apiKey } = req.body;
    const targetLanguage = target_lang || dest;
    
    // Attempt to parse GEMINI_API_KEY from environment or request fallback
    const GEMINI_API_KEY = apiKey || process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(400).json({ error: 'GEMINI_API_KEY is not configured. Please set it in your environment or Settings.' });
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{
                        text: `You are an expert legal translator. Translate the provided text into ${targetLanguage}. Maintain all HTML tags, structure, CSS styles, and FreeMarker template variables like \${...} and <#if ...> exactly as they are without translating them. CRITICAL RULE: If a legal term, Act name, Section, Bank Name, or complex sentence is difficult to understand naturally when translated into ${targetLanguage}, you MUST keep that specific part in its original English. Ensure very high accuracy of legal terminology.`
                    }]
                },
                contents: [{
                    parts: [{
                        text: text
                    }]
                }],
                generationConfig: {
                    temperature: 0.1,
                }
            })
        });

        const data = await response.json();
        
        if (data.error) throw new Error(data.error.message);
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("No translation generated by Gemini.");
        }

        let result = data.candidates[0].content.parts[0].text;
        
        // Remove markdown formatting if Gemini wrapped the response
        result = result.replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/```$/g, '');
        
        res.json({ translated_text: result.trim() });
    } catch (error) {
        console.error('Gemini Translation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- Translation via Gemini API with Back-Translation Accuracy ---
app.post('/api/translate-with-accuracy', async (req, res) => {
    const { text, target_lang, dest, apiKey } = req.body;
    const targetLanguage = target_lang || dest;
    
    const GEMINI_API_KEY = apiKey || process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(400).json({ error: 'GEMINI_API_KEY is not configured. Please set it in your environment or Settings.' });
    }

    try {
        // Step 1: Translate origin to target language
        const response1 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: `You are an expert legal translator. Translate the provided text into ${targetLanguage}. Maintain all HTML tags, structure, CSS styles, and FreeMarker template variables exactly as they are without translating them. CRITICAL RULE: If a legal term, Act name, Section, Bank Name, or complex sentence is difficult to understand naturally when translated into ${targetLanguage}, you MUST keep that specific part in its original English.` }]
                },
                contents: [{ parts: [{ text: text }] }],
                generationConfig: { temperature: 0.1 }
            })
        });

        const data1 = await response1.json();
        if (data1.error) throw new Error(data1.error.message);
        if (!data1.candidates || data1.candidates.length === 0) throw new Error("No translation generated.");
        let translatedText = data1.candidates[0].content.parts[0].text.replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/```$/g, '').trim();

        // Step 2: Translate target language back to English
        const response2 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: `You are an expert legal translator. Translate the provided text literally back into English. Maintain all HTML tags, structure, CSS styles, and FreeMarker template variables exactly as they are without translating them.` }]
                },
                contents: [{ parts: [{ text: translatedText }] }],
                generationConfig: { temperature: 0.1 }
            })
        });

        const data2 = await response2.json();
        if (data2.error) throw new Error(data2.error.message);
        if (!data2.candidates || data2.candidates.length === 0) throw new Error("No back-translation generated.");
        let backTranslatedText = data2.candidates[0].content.parts[0].text.replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/```$/g, '').trim();

        // Step 3: Calculate Overlap (Fallback)
        function calculateSimilarity(str1, str2) {
            if (!str1 || !str2) return 0;
            const clean1 = str1.replace(/<[^>]*>?/gm, '').toLowerCase().replace(/[^\w\s]/g, " ").trim();
            const clean2 = str2.replace(/<[^>]*>?/gm, '').toLowerCase().replace(/[^\w\s]/g, " ").trim();
            if (clean1 === clean2) return 100;
            const words1 = clean1.split(/\s+/);
            const words2 = clean2.split(/\s+/);
            if (words1.length === 0) return 100;
            const set2 = new Set(words2);
            let common = 0;
            for (let w of words1) {
                if (set2.has(w)) common++;
            }
            return Math.min(100, Math.max(0, Math.round((common / words1.length) * 100)));
        }

        let score = 100;
        let reason = "";
        
        try {
            const response3 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: `You are an expert linguistic analyst.` }]
                    },
                    contents: [{ parts: [{ text: `Original English text: "${text}"\n\nBack-translated English text: "${backTranslatedText}"\n\nCompare the semantic meaning of these two texts. Return a JSON object with strictly two keys:\n1. 'score': A number from 0 to 100 representing how well the absolute legal intent and meaning was preserved (e.g. 96 for excellent translations using valid synonyms).\n2. 'reason': A 1-sentence explanation of why it differs from 100 (e.g. "Some formal nouns were replaced with valid synonyms"). If score is 100, leave empty.` }] }],
                    generationConfig: { 
                        temperature: 0.1,
                        responseMimeType: "application/json"
                    }
                })
            });
            const data3 = await response3.json();
            if (data3.candidates && data3.candidates.length > 0) {
                const aiOutput = JSON.parse(data3.candidates[0].content.parts[0].text.trim());
                score = aiOutput.score;
                reason = aiOutput.reason || "";
            }
        } catch (e) {
            console.error("AI Reason/Score generation failed, using fallback script.", e);
            score = calculateSimilarity(text, backTranslatedText);
            if (score < 100) reason = `Algorithm matched ${score}% of exact English words directly.`;
        }

        res.json({ translated_text: translatedText, accuracy: score, reason: reason });
    } catch (error) {
        console.error('Gemini Accuracy Translation error:', error);
        res.status(500).json({ error: error.message });
    }
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
