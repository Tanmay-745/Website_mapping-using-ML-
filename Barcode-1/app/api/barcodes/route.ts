import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Path to our JSON database
const dataFilePath = path.join(process.cwd(), 'data/barcodes.json');

// Helper to read data
export interface BarcodeItem {
    id: string;
    code: string;
    lenderName: string;
    bankName?: string;
    createdAt: string;
    isUsed: boolean;
    lan?: string;
    usedAt?: string;
    resetAt?: number;
}

// Helper to read data with retry logic
async function getBarcodes(retries = 3): Promise<BarcodeItem[]> {
    try {
        const data = await fs.readFile(dataFilePath, 'utf8');
        if (!data || data.trim() === '') {
            return [];
        }
        return JSON.parse(data) as BarcodeItem[];
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, return empty array
            return [];
        }
        // If JSON parse fails, it might be a read/write race condition.
        if (error instanceof SyntaxError) {
            console.error("JSON Parse Error in barcodes.json:", error);
            if (retries > 0) {
                console.log(`Retrying read... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
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
async function saveBarcodes(barcodes: BarcodeItem[]) {
    // Ensure directory exists
    const dir = path.dirname(dataFilePath);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }

    // Write to a temporary file first
    const tempFilePath = `${dataFilePath}.tmp`;
    await fs.writeFile(tempFilePath, JSON.stringify(barcodes, null, 2));

    // Atomic rename: this replaces the old file with the new one in a single operation
    // This prevents reading a partially written file
    await fs.rename(tempFilePath, dataFilePath);
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const count = searchParams.get('count');

    let barcodes = await getBarcodes();

    if (status === 'available') {
        barcodes = barcodes.filter(b => !b.isUsed);
    }

    if (count) {
        barcodes = barcodes.slice(0, Number(count));
    }

    return NextResponse.json(barcodes, {
        headers: {
            'Access-Control-Allow-Origin': '*', // Allow CSV Portal to access
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        }
    });
}

// Handle CORS Preflight
export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });
}

export async function POST(request: Request) {
    const body = await request.json();
    const { action, barcodeId, lenderName, newBarcodes } = body;

    let barcodes = await getBarcodes();

    if (action === 'markUsed') {
        if (body.updates) {
            // Bulk update
            const updates = body.updates as { id: string, lenderName: string, lan: string, bankName?: string }[];
            barcodes = barcodes.map(b => {
                const update = updates.find(u => u.id === b.id);
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
            barcodes = barcodes.map(b =>
                b.id === barcodeId
                    ? {
                        ...b,
                        isUsed: true,
                        lenderName: lenderName,
                        bankName: body.bankName,
                        lan: body.lan || "",
                        usedAt: new Date().toLocaleDateString() // Track usage date
                    }
                    : b
            );
        }
    } else if (action === 'reset') {
        // Start the reset timer, but DO NOT clear the data yet
        barcodes = barcodes.map(b =>
            b.id === barcodeId ? { ...b, resetAt: Date.now() } : b
        );
    } else if (action === 'cancelReset') {
        // Cancel the reset by removing the timestamp
        barcodes = barcodes.map(b =>
            b.id === barcodeId ? { ...b, resetAt: undefined } : b
        );
    } else if (action === 'completeReset') {
        // Finalize the reset by clearing data
        barcodes = barcodes.map(b =>
            b.id === barcodeId ? {
                ...b,
                isUsed: false,
                lenderName: '',
                bankName: undefined,
                lan: '',
                usedAt: undefined,
                resetAt: undefined
            } : b
        );
    } else if (action === 'editLenderName') {
        const { oldLenderName, newLenderName } = body;
        if (oldLenderName && newLenderName) {
            barcodes = barcodes.map(b => {
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
            barcodes = barcodes.map(b => {
                const isMatch = (targetLender === "Unknown Lender") 
                    ? (!b.bankName || b.bankName.trim() === "")
                    : (b.bankName === targetLender);
                
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
        const newBarcodesArray = newBarcodes as any[];
        // Validate and merge
        const existingCodes = new Set(barcodes.map(b => b.code));
        let nextId = barcodes.length > 0 ? Math.max(...barcodes.map(b => parseInt(b.id))) + 1 : 1;

        for (const nb of newBarcodesArray) {
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

    return NextResponse.json({ success: true, barcodes }, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        }
    });
}
