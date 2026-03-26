module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[project]/Barcode-1/app/api/barcodes/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "OPTIONS",
    ()=>OPTIONS,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Barcode$2d$1$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Barcode-1/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
;
;
;
// Path to our JSON database
const dataFilePath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.cwd(), 'data/barcodes.json');
// Helper to read data with retry logic
async function getBarcodes(retries = 3) {
    try {
        const data = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].readFile(dataFilePath, 'utf8');
        if (!data || data.trim() === '') {
            return [];
        }
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, return empty array
            return [];
        }
        // If JSON parse fails, it might be a read/write race condition.
        if (error instanceof SyntaxError) {
            console.error("JSON Parse Error in barcodes.json:", error);
            if (retries > 0) {
                console.log(`Retrying read... (${retries} attempts left)`);
                await new Promise((resolve)=>setTimeout(resolve, 100)); // Wait 100ms
                return getBarcodes(retries - 1);
            }
            // If all retries fail, THROW the error. Do NOT return empty array.
            // Returning [] would cause the app to overwrite the corrupted file with empty data, losing everything.
            throw new Error("Failed to parse barcodes.json after multiple attempts. Data might be corrupted.");
        }
        throw error;
    }
}
// Helper to write data atomically
async function saveBarcodes(barcodes) {
    // Ensure directory exists
    const dir = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].dirname(dataFilePath);
    try {
        await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].access(dir);
    } catch  {
        await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].mkdir(dir, {
            recursive: true
        });
    }
    // Write to a temporary file first
    const tempFilePath = `${dataFilePath}.tmp`;
    await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].writeFile(tempFilePath, JSON.stringify(barcodes, null, 2));
    // Atomic rename: this replaces the old file with the new one in a single operation
    // This prevents reading a partially written file
    await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].rename(tempFilePath, dataFilePath);
}
async function GET(request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const count = searchParams.get('count');
    let barcodes = await getBarcodes();
    if (status === 'available') {
        barcodes = barcodes.filter((b)=>!b.isUsed);
    }
    if (count) {
        barcodes = barcodes.slice(0, Number(count));
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$Barcode$2d$1$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(barcodes, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        }
    });
}
async function OPTIONS() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$Barcode$2d$1$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}
async function POST(request) {
    const body = await request.json();
    const { action, barcodeId, lenderName, newBarcodes } = body;
    let barcodes = await getBarcodes();
    if (action === 'markUsed') {
        if (body.updates) {
            // Bulk update
            const updates = body.updates;
            barcodes = barcodes.map((b)=>{
                const update = updates.find((u)=>u.id === b.id);
                if (update) {
                    return {
                        ...b,
                        isUsed: true,
                        lenderName: update.lenderName,
                        bankName: update.bankName,
                        lan: update.lan || "",
                        usedAt: new Date().toLocaleDateString() // Track usage date
                    };
                }
                return b;
            });
        } else {
            // Single update
            barcodes = barcodes.map((b)=>b.id === barcodeId ? {
                    ...b,
                    isUsed: true,
                    lenderName: lenderName,
                    bankName: body.bankName,
                    lan: body.lan || "",
                    usedAt: new Date().toLocaleDateString() // Track usage date
                } : b);
        }
    } else if (action === 'reset') {
        // Start the reset timer, but DO NOT clear the data yet
        barcodes = barcodes.map((b)=>b.id === barcodeId ? {
                ...b,
                resetAt: Date.now()
            } : b);
    } else if (action === 'cancelReset') {
        // Cancel the reset by removing the timestamp
        barcodes = barcodes.map((b)=>b.id === barcodeId ? {
                ...b,
                resetAt: undefined
            } : b);
    } else if (action === 'completeReset') {
        // Finalize the reset by clearing data
        barcodes = barcodes.map((b)=>b.id === barcodeId ? {
                ...b,
                isUsed: false,
                lenderName: '',
                bankName: undefined,
                lan: '',
                usedAt: undefined,
                resetAt: undefined
            } : b);
    } else if (action === 'editLenderName') {
        const { oldLenderName, newLenderName } = body;
        if (oldLenderName && newLenderName) {
            barcodes = barcodes.map((b)=>{
                const bLender = b.bankName && b.bankName.trim() !== "" ? b.bankName : "Unknown Lender";
                if (b.isUsed && bLender === oldLenderName) {
                    return {
                        ...b,
                        bankName: newLenderName
                    };
                }
                return b;
            });
        }
    } else if (action === 'resetByLender') {
        const targetLender = body.targetLender;
        if (targetLender) {
            barcodes = barcodes.map((b)=>{
                const isMatch = targetLender === "Unknown Lender" ? !b.bankName || b.bankName.trim() === "" : b.bankName === targetLender;
                if (isMatch && b.isUsed) {
                    return {
                        ...b,
                        isUsed: false,
                        lenderName: '',
                        bankName: undefined,
                        lan: '',
                        usedAt: undefined,
                        resetAt: undefined
                    };
                }
                return b;
            });
        }
    } else if (action === 'add' && newBarcodes) {
        const newBarcodesArray = newBarcodes;
        // Validate and merge
        const existingCodes = new Set(barcodes.map((b)=>b.code));
        let nextId = barcodes.length > 0 ? Math.max(...barcodes.map((b)=>parseInt(b.id))) + 1 : 1;
        for (const nb of newBarcodesArray){
            if (!existingCodes.has(nb.code)) {
                barcodes.push({
                    id: String(nextId++),
                    code: nb.code,
                    lenderName: nb.lenderName || "",
                    bankName: nb.bankName || "",
                    lan: nb.lan || "",
                    createdAt: nb.createdAt || new Date().toLocaleDateString(),
                    isUsed: nb.isUsed || false
                });
                existingCodes.add(nb.code);
            }
        }
    }
    await saveBarcodes(barcodes);
    return __TURBOPACK__imported__module__$5b$project$5d2f$Barcode$2d$1$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        success: true,
        barcodes
    }, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        }
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__49753a3d._.js.map