import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import archiver from 'archiver';
import bwipjs from 'bwip-js';
import {
    AlignmentType,
    BorderStyle,
    Document,
    HeadingLevel,
    ImageRun,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType
} from 'docx';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';
import libre from 'libreoffice-convert';
import mammoth from 'mammoth';
import { PDFDocument } from 'pdf-lib';
import PizZip from 'pizzip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const libreConvertAsync = promisify(libre.convert);

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
const PROJECT_NOTICE_DIR = path.join(__dirname, '..', 'Notice folder');
const TEMPLATES_DIR = fs.existsSync(PROJECT_NOTICE_DIR)
    ? PROJECT_NOTICE_DIR
    : path.join(__dirname, 'Notice folder');
if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR);

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const TEMPLATE_XML_FILES = /^(word\/document\.xml|word\/header\d*\.xml|word\/footer\d*\.xml)$/;

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeFilePart(value, fallback = 'notice') {
    const safe = String(value || fallback)
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
    return safe || fallback;
}

function safeTemplatePath(filename) {
    const resolved = path.resolve(TEMPLATES_DIR, path.basename(filename || ''));
    const root = path.resolve(TEMPLATES_DIR);
    if (!resolved.startsWith(root + path.sep) && resolved !== root) {
        throw new Error('Invalid template path');
    }
    return resolved;
}

function decodeHtmlEntities(text = '') {
    return String(text)
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function parseAttributes(raw = '') {
    const attrs = {};
    raw.replace(/([\w:-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g, (_match, key, _value, dbl, sgl, bare) => {
        attrs[key.toLowerCase()] = dbl ?? sgl ?? bare ?? '';
        return '';
    });
    return attrs;
}

function parseHtml(html = '') {
    const root = { type: 'element', name: 'root', attrs: {}, children: [] };
    const stack = [root];
    const voidTags = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);
    const tokens = String(html).match(/<!--[\s\S]*?-->|<\/?[^>]+>|[^<]+/g) || [];

    for (const token of tokens) {
        if (token.startsWith('<!--')) continue;
        if (token.startsWith('</')) {
            const closingName = token.replace(/^<\//, '').replace(/>$/, '').trim().toLowerCase();
            while (stack.length > 1 && stack[stack.length - 1].name !== closingName) {
                stack.pop();
            }
            if (stack.length > 1) stack.pop();
            continue;
        }

        if (token.startsWith('<')) {
            const selfClosing = /\/>$/.test(token);
            const tagBody = token.replace(/^</, '').replace(/\/?>$/, '').trim();
            const firstSpace = tagBody.search(/\s/);
            const name = (firstSpace >= 0 ? tagBody.slice(0, firstSpace) : tagBody).toLowerCase();
            if (!name || name === 'script' || name === 'style') continue;

            const attrs = parseAttributes(firstSpace >= 0 ? tagBody.slice(firstSpace + 1) : '');
            const node = { type: 'element', name, attrs, children: [] };
            stack[stack.length - 1].children.push(node);

            if (!selfClosing && !voidTags.has(name)) {
                stack.push(node);
            }
            continue;
        }

        stack[stack.length - 1].children.push({ type: 'text', text: decodeHtmlEntities(token) });
    }

    return root.children;
}

function textFromNodes(nodes = []) {
    return nodes.map((node) => {
        if (node.type === 'text') return node.text;
        if (node.name === 'br') return '\n';
        return textFromNodes(node.children || []);
    }).join('');
}

function parseDataImage(src = '') {
    const match = String(src).match(/^data:image\/(png|jpe?g|gif|bmp);base64,([A-Za-z0-9+/=\r\n]+)$/i);
    if (!match) return null;
    const type = match[1].toLowerCase().replace('jpeg', 'jpg');
    return {
        type,
        data: Buffer.from(match[2].replace(/\s/g, ''), 'base64')
    };
}

function sizeFromStyle(style = '', fallback = { width: 180, height: 70 }) {
    const widthMatch = String(style).match(/(?:max-)?width\s*:\s*(\d+)/i);
    const heightMatch = String(style).match(/(?:max-)?height\s*:\s*(\d+)/i);
    return {
        width: widthMatch ? Math.min(Number(widthMatch[1]), 520) : fallback.width,
        height: heightMatch ? Math.min(Number(heightMatch[1]), 180) : fallback.height
    };
}

function alignmentFromStyle(style = '') {
    const match = String(style).match(/text-align\s*:\s*(center|right|left|justify)/i);
    if (!match) return undefined;
    const value = match[1].toLowerCase();
    if (value === 'center') return AlignmentType.CENTER;
    if (value === 'right') return AlignmentType.RIGHT;
    if (value === 'justify') return AlignmentType.JUSTIFIED;
    return AlignmentType.LEFT;
}

function buildRuns(nodes = [], style = {}) {
    const runs = [];

    for (const node of nodes) {
        if (node.type === 'text') {
            const pieces = String(node.text).split(/\r?\n/);
            pieces.forEach((piece, index) => {
                if (index > 0) runs.push(new TextRun({ break: 1 }));
                if (piece.length > 0) {
                    runs.push(new TextRun({ text: piece, ...style }));
                }
            });
            continue;
        }

        if (node.name === 'br') {
            runs.push(new TextRun({ break: 1 }));
            continue;
        }

        if (node.name === 'img') {
            const image = parseDataImage(node.attrs?.src || '');
            if (image) {
                const size = sizeFromStyle(node.attrs?.style, { width: 220, height: 90 });
                runs.push(new ImageRun({
                    type: image.type,
                    data: image.data,
                    transformation: size
                }));
            } else {
                runs.push(new TextRun({ text: '[Image]', ...style }));
            }
            continue;
        }

        const childStyle = { ...style };
        if (node.name === 'strong' || node.name === 'b') childStyle.bold = true;
        if (node.name === 'em' || node.name === 'i') childStyle.italics = true;
        if (node.name === 'u') childStyle.underline = {};
        if (node.name === 'sup') childStyle.superScript = true;
        if (node.name === 'sub') childStyle.subScript = true;
        runs.push(...buildRuns(node.children || [], childStyle));
    }

    return runs.length ? runs : [new TextRun('')];
}

function createParagraph(nodes = [], options = {}) {
    return new Paragraph({
        children: buildRuns(nodes, options.runStyle || {}),
        alignment: options.alignment,
        heading: options.heading,
        spacing: { after: options.after ?? 160 }
    });
}

function htmlNodeToDocx(node, context = {}) {
    if (node.type === 'text') {
        const text = node.text.trim();
        return text ? [new Paragraph({ children: [new TextRun(text)] })] : [];
    }

    const style = node.attrs?.style || '';
    const alignment = alignmentFromStyle(style);

    if (node.name === 'h1' || node.name === 'h2' || node.name === 'h3') {
        const heading = node.name === 'h1'
            ? HeadingLevel.HEADING_1
            : node.name === 'h2'
                ? HeadingLevel.HEADING_2
                : HeadingLevel.HEADING_3;
        return [createParagraph(node.children, { heading, alignment, runStyle: { bold: true }, after: 220 })];
    }

    if (node.name === 'p' || node.name === 'div' || node.name === 'section' || node.name === 'article') {
        const text = textFromNodes(node.children || []).trim();
        const hasImage = (node.children || []).some((child) => child.name === 'img');
        if (!text && !hasImage) return [new Paragraph('')];
        return [createParagraph(node.children, { alignment })];
    }

    if (node.name === 'ul' || node.name === 'ol') {
        return (node.children || [])
            .filter((child) => child.name === 'li')
            .flatMap((child, index) => htmlNodeToDocx(child, {
                listType: node.name,
                index
            }));
    }

    if (node.name === 'li') {
        const prefix = context.listType === 'ol' ? `${(context.index || 0) + 1}. ` : '- ';
        return [new Paragraph({
            children: [new TextRun(prefix), ...buildRuns(node.children || [])],
            spacing: { after: 80 }
        })];
    }

    if (node.name === 'table') {
        const rowNodes = (node.children || [])
            .flatMap((child) => child.name === 'tbody' || child.name === 'thead' ? child.children || [] : [child])
            .filter((child) => child.name === 'tr');
        if (!rowNodes.length) return [];

        return [new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: '94A3B8' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: '94A3B8' },
                left: { style: BorderStyle.SINGLE, size: 1, color: '94A3B8' },
                right: { style: BorderStyle.SINGLE, size: 1, color: '94A3B8' },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '94A3B8' },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '94A3B8' }
            },
            rows: rowNodes.map((rowNode) => new TableRow({
                children: (rowNode.children || [])
                    .filter((child) => child.name === 'td' || child.name === 'th')
                    .map((cellNode) => {
                        const blocks = (cellNode.children || []).some((child) => ['p', 'div', 'ul', 'ol', 'table'].includes(child.name))
                            ? (cellNode.children || []).flatMap((child) => htmlNodeToDocx(child))
                            : [createParagraph(cellNode.children || [], { after: 80 })];
                        return new TableCell({
                            children: blocks.length ? blocks : [new Paragraph('')],
                            margins: { top: 120, bottom: 120, left: 120, right: 120 }
                        });
                    })
            }))
        })];
    }

    if (node.name === 'hr') {
        return [new Paragraph({ text: '________________________________________', spacing: { after: 160 } })];
    }

    return (node.children || []).flatMap((child) => htmlNodeToDocx(child, context));
}

function htmlToDocxChildren(html = '') {
    const nodes = parseHtml(html);
    const children = nodes.flatMap((node) => htmlNodeToDocx(node));
    return children.length ? children : [new Paragraph('')];
}

function normalizeConditionTag(expression = '') {
    const decoded = decodeHtmlEntities(expression).replace(/\$\{|\}/g, '').trim();
    const listMatch = decoded.match(/^([A-Za-z_][\w.]*)\s+as\s+/i);
    const identifier = listMatch?.[1] || decoded.match(/[A-Za-z_][\w.]*/)?.[0] || 'condition';
    return identifier.replace(/[^\w.]/g, '') || 'condition';
}

function normalizeTemplateSyntax(input = '', imageTags = []) {
    let output = String(input);

    output = output.replace(/\[\[([^\]]+)\]\]/g, (_match, tag) => `\${${String(tag).trim()}}`);

    for (const tag of imageTags) {
        const safeTag = escapeRegExp(tag);
        output = output.replace(new RegExp(`\\$\\{${safeTag}\\}`, 'g'), `\${%${tag}}`);
    }

    const stack = [];
    output = output.replace(/(&lt;#if\s+([^&]+?)&gt;|<#if\s+([^>]+)>|&lt;#list\s+([^&]+?)&gt;|<#list\s+([^>]+)>|&lt;\/#(?:if|list)&gt;|<\/#(?:if|list)>)/g, (match, _all, escapedIf, rawIf, escapedList, rawList) => {
        if (match.includes('/#')) {
            const tag = stack.pop() || '';
            return tag ? `\${/${tag}}` : '';
        }
        const expression = escapedIf || rawIf || escapedList || rawList || '';
        const tag = normalizeConditionTag(expression);
        stack.push(tag);
        return `\${#${tag}}`;
    });

    return output;
}

async function createDocxTemplateFromHtml(html, imageTags = []) {
    const normalizedHtml = normalizeTemplateSyntax(html, imageTags);
    const document = new Document({
        sections: [{
            properties: {},
            children: htmlToDocxChildren(normalizedHtml)
        }]
    });
    return Packer.toBuffer(document);
}

function normalizeDocxZip(zip, imageTags = []) {
    for (const fileName of Object.keys(zip.files)) {
        if (!TEMPLATE_XML_FILES.test(fileName)) continue;
        const file = zip.file(fileName);
        if (!file) continue;
        zip.file(fileName, normalizeTemplateSyntax(file.asText(), imageTags));
    }
}

function extractPlaceholdersFromText(content = '') {
    const matches = [];
    for (const match of String(content).matchAll(/\$\{([%#/]?)([^}]+)\}/g)) {
        if (!match[1]) matches.push(match[2].trim());
    }
    for (const match of String(content).matchAll(/\[\[([^\]]+)\]\]/g)) {
        matches.push(match[1].trim());
    }
    return [...new Set(matches.filter(Boolean))];
}

function extractPlaceholdersFromDocx(buffer) {
    const zip = new PizZip(buffer);
    let xml = '';
    for (const fileName of Object.keys(zip.files)) {
        if (TEMPLATE_XML_FILES.test(fileName)) {
            xml += zip.file(fileName).asText();
        }
    }
    return extractPlaceholdersFromText(decodeHtmlEntities(xml));
}

function getBarcodeValue(row = {}, options = {}) {
    const preferred = [
        options.barcodeField,
        'barcode_value',
        'barcode',
        'Barcode',
        'BARCODE',
        'loan_account_number',
        'loan_account',
        'account_number',
        'account_no',
        'LAN'
    ].filter(Boolean);

    for (const key of preferred) {
        if (row[key] != null && String(row[key]).trim()) return String(row[key]).trim();
    }

    const fuzzyKey = Object.keys(row).find((key) => /barcode|loan|account|lan/i.test(key) && String(row[key] || '').trim());
    return fuzzyKey ? String(row[fuzzyKey]).trim() : '';
}

async function generateBarcodeBuffer(value) {
    if (!value) return null;
    return bwipjs.toBuffer({
        bcid: 'code128',
        text: String(value),
        scale: 3,
        height: 12,
        includetext: true,
        textxalign: 'center'
    });
}

function addDataAliases(data, row = {}) {
    for (const [key, value] of Object.entries(row)) {
        const normalized = key.trim().replace(/\s+/g, '_');
        data[normalized] = value;
        data[normalized.toLowerCase()] = value;
    }
}

async function buildTemplateData(row = {}, options = {}) {
    const data = { ...row };
    addDataAliases(data, row);

    data.header = options.header || '';
    data.lender = options.lender || '';
    data.notice_type = options.noticeType || '';
    data.generated_date = new Date().toLocaleDateString('en-IN');

    const barcodeValue = getBarcodeValue(row, options);
    data.barcode_value = barcodeValue;

    const images = {};
    const barcodeBuffer = await generateBarcodeBuffer(barcodeValue);
    if (barcodeBuffer) {
        images.barcode = barcodeBuffer;
        data.barcode = 'barcode';
    }

    const signatureImage = parseDataImage(options.signature || options.advocateSignature || '');
    if (signatureImage) {
        images.signature = signatureImage.data;
        images.advocate_sign = signatureImage.data;
        data.signature = 'signature';
        data.advocate_sign = 'advocate_sign';
    }

    return { data, images };
}

function buildImageModule(images = {}) {
    return new ImageModule({
        centered: false,
        fileType: 'docx',
        getImage: (tagValue, tagName) => images[tagName] || images[tagValue],
        getSize: (_img, _tagValue, tagName) => tagName === 'barcode' ? [180, 70] : [160, 70]
    });
}

async function buildDocx(templateBuffer, row, options = {}) {
    const { data, images } = await buildTemplateData(row, options);
    const zip = new PizZip(templateBuffer);
    normalizeDocxZip(zip, Object.keys(images));

    const doc = new Docxtemplater()
        .loadZip(zip)
        .setOptions({
            delimiters: { start: '${', end: '}' },
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => ''
        });

    if (Object.keys(images).length > 0) {
        doc.attachModule(buildImageModule(images));
    }

    doc.setData(data).render();
    return doc.getZip().generate({
        type: 'nodebuffer',
        mimeType: DOCX_MIME,
        compression: 'DEFLATE'
    });
}

function findLibreOfficeExecutable() {
    const candidates = [
        process.env.LIBREOFFICE_PATH,
        'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
        'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
        '/usr/bin/libreoffice',
        '/usr/bin/soffice',
        '/Applications/LibreOffice.app/Contents/MacOS/soffice'
    ].filter(Boolean);
    return candidates.find((candidate) => fs.existsSync(candidate));
}

async function convertDocxToPdf(docxBuffer) {
    const libreOffice = findLibreOfficeExecutable();
    if (!libreOffice) {
        throw new Error('LibreOffice was not found. Install it at C:\\Program Files\\LibreOffice\\program or set LIBREOFFICE_PATH.');
    }
    return libreConvertAsync(docxBuffer, '.pdf', undefined);
}

async function mergePdfBuffers(pdfItems) {
    const merged = await PDFDocument.create();
    for (const item of pdfItems) {
        const source = await PDFDocument.load(item.buffer);
        const pages = await merged.copyPages(source, source.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
    }
    return Buffer.from(await merged.save());
}

async function resolveTemplateBuffer(payload = {}, imageTags = []) {
    if (payload.templateDocxBase64) {
        return Buffer.from(String(payload.templateDocxBase64).replace(/^data:.*?;base64,/, ''), 'base64');
    }

    if (payload.templateName) {
        const templatePath = safeTemplatePath(payload.templateName);
        if (!fs.existsSync(templatePath)) throw new Error('Template not found');
        if (templatePath.toLowerCase().endsWith('.docx')) return fs.readFileSync(templatePath);
        return createDocxTemplateFromHtml(fs.readFileSync(templatePath, 'utf8'), imageTags);
    }

    return createDocxTemplateFromHtml(payload.content || '', imageTags);
}

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

app.get('/api/templates/file/:filename', async (req, res) => {
    try {
        const filePath = safeTemplatePath(req.params.filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Template not found' });
        }

        if (filePath.toLowerCase().endsWith('.docx')) {
            const result = await mammoth.convertToHtml({ buffer: fs.readFileSync(filePath) });
            res.type('html').send(result.value);
            return;
        }

        res.type('html').send(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        console.error('Template file load failed:', err);
        res.status(500).json({ error: err.message || 'Template file load failed' });
    }
});

app.post('/api/templates/save', async (req, res) => {
    const { lender, type, content } = req.body;
    const filename = `${sanitizeFilePart(lender, 'template')}_${sanitizeFilePart(type, 'notice')}_${Date.now()}.docx`;
    try {
        const buffer = await createDocxTemplateFromHtml(content || '', ['barcode', 'signature', 'advocate_sign']);
        fs.writeFileSync(path.join(TEMPLATES_DIR, filename), buffer);
        res.json({ success: true, filename });
    } catch (err) {
        console.error('Template save failed:', err);
        res.status(500).json({ error: err.message || 'Save failed' });
    }
});

app.post('/api/templates/analyze', (req, res) => {
    const { templateName } = req.body;
    try {
        const filePath = safeTemplatePath(templateName);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Template not found' });
        }
        const placeholders = filePath.toLowerCase().endsWith('.docx')
            ? extractPlaceholdersFromDocx(fs.readFileSync(filePath))
            : extractPlaceholdersFromText(fs.readFileSync(filePath, 'utf8'));
        res.json({ placeholders });
    } catch (err) {
        console.error('Template analysis failed:', err);
        res.status(500).json({ error: err.message || 'Analysis failed' });
    }
});

app.post('/api/templates/analyze-upload', (req, res) => {
    try {
        const { templateDocxBase64 } = req.body || {};
        if (!templateDocxBase64) {
            return res.status(400).json({ error: 'templateDocxBase64 is required' });
        }
        const buffer = Buffer.from(String(templateDocxBase64).replace(/^data:.*?;base64,/, ''), 'base64');
        res.json({ placeholders: extractPlaceholdersFromDocx(buffer) });
    } catch (err) {
        console.error('Uploaded template analysis failed:', err);
        res.status(500).json({ error: err.message || 'Uploaded template analysis failed' });
    }
});

app.post('/api/notices/export', async (req, res) => {
    const payload = req.body || {};
    const rows = Array.isArray(payload.rows) && payload.rows.length > 0
        ? payload.rows
        : Array.isArray(payload.sampleData) && payload.sampleData.length > 0
            ? payload.sampleData
            : [{}];

    const exportPdf = payload.exportPdf !== false;
    const mergePdf = payload.mergePdf !== false;
    const includeDocx = payload.includeDocx !== false;
    const prefix = sanitizeFilePart(payload.filenamePrefix || payload.noticeType || payload.templateName || 'notice');
    const imageTags = ['barcode', 'signature', 'advocate_sign'];

    try {
        const templateBuffer = await resolveTemplateBuffer(payload, imageTags);
        const generated = [];
        const pdfItems = [];

        for (const [index, row] of rows.entries()) {
            const sequence = String(index + 1).padStart(3, '0');
            const baseName = `${prefix}_${sequence}`;
            const docxBuffer = await buildDocx(templateBuffer, row, {
                ...payload,
                signature: payload.signature || payload.advocateDetails?.signature
            });

            if (includeDocx) {
                generated.push({ name: `docx/${baseName}.docx`, buffer: docxBuffer });
            }

            if (exportPdf) {
                const pdfBuffer = await convertDocxToPdf(docxBuffer);
                const pdfName = `pdf/${baseName}.pdf`;
                generated.push({ name: pdfName, buffer: pdfBuffer });
                pdfItems.push({ name: pdfName, buffer: pdfBuffer });
            }
        }

        if (exportPdf && mergePdf && pdfItems.length > 1) {
            generated.push({
                name: 'merged_notices.pdf',
                buffer: await mergePdfBuffers(pdfItems)
            });
        }

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${prefix}_notices.zip"`);

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', (err) => {
            console.error('ZIP archive failed:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: err.message || 'ZIP archive failed' });
            } else {
                res.destroy(err);
            }
        });

        archive.pipe(res);
        generated.forEach((file) => archive.append(file.buffer, { name: file.name }));
        await archive.finalize();
    } catch (err) {
        console.error('Notice export failed:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message || 'Notice export failed' });
        }
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Unified Backend Server running at http://0.0.0.0:${PORT}`);
});
