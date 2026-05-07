const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Point directly to the root of the Barcode-1 folder where data/ resides
const dataFilePath = path.join(__dirname, '../data/barcodes.json');

// Ensure database array exists
async function getBarcodes(retries = 3) {
    try {
        const data = await fs.readFile(dataFilePath, 'utf8');
        if (!data || data.trim() === '') {
            return [];
        }
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        if (error instanceof SyntaxError) {
            console.error("JSON Parse Error in barcodes.json:", error);
            if (retries > 0) {
                console.log(`Retrying read... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 100));
                return getBarcodes(retries - 1);
            }
            throw new Error("Failed to parse barcodes.json after multiple attempts. Data might be corrupted.");
        }
        throw error;
    }
}

// Write helper
async function saveBarcodes(barcodes) {
    const dir = path.dirname(dataFilePath);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }

    const tempFilePath = `${dataFilePath}.tmp`;
    await fs.writeFile(tempFilePath, JSON.stringify(barcodes, null, 2));
    await fs.rename(tempFilePath, dataFilePath);
}

// GET Route
app.get('/api/barcodes', async (req, res) => {
    try {
        const status = req.query.status;
        const count = req.query.count;

        let barcodes = await getBarcodes();

        if (status === 'available') {
            barcodes = barcodes.filter(b => !b.isUsed);
        }

        if (count) {
            barcodes = barcodes.slice(0, Number(count));
        }

        res.json(barcodes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST Route
app.post('/api/barcodes', async (req, res) => {
    try {
        const body = req.body;
        const { action, barcodeId, lenderName, newBarcodes, targetLender } = body;

        let barcodes = await getBarcodes();

        if (action === 'markUsed') {
            if (body.updates) {
                const updates = body.updates;
                barcodes = barcodes.map(b => {
                    const update = updates.find(u => u.id === b.id);
                    if (update) {
                        return {
                            ...b,
                            isUsed: true,
                            lenderName: update.lenderName,
                            bankName: update.bankName,
                            lan: update.lan || "",
                            usedAt: new Date().toLocaleDateString()
                        };
                    }
                    return b;
                });
            } else {
                barcodes = barcodes.map(b =>
                    b.id === barcodeId
                        ? {
                            ...b,
                            isUsed: true,
                            lenderName: lenderName,
                            bankName: body.bankName,
                            lan: body.lan || "",
                            usedAt: new Date().toLocaleDateString()
                        }
                        : b
                );
            }
        } else if (action === 'reset') {
            barcodes = barcodes.map(b =>
                b.id === barcodeId ? { ...b, resetAt: Date.now() } : b
            );
        } else if (action === 'cancelReset') {
            barcodes = barcodes.map(b =>
                b.id === barcodeId ? { ...b, resetAt: undefined } : b
            );
        } else if (action === 'completeReset') {
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
                        return { ...b, bankName: newLenderName };
                    }
                    return b;
                });
            }
        } else if (action === 'resetByCode') {
            const { barcodeCodes } = body;
            if (Array.isArray(barcodeCodes)) {
                const codesToReset = new Set(barcodeCodes);
                barcodes = barcodes.map(b =>
                    codesToReset.has(b.code) ? {
                        ...b,
                        isUsed: false,
                        lenderName: '',
                        bankName: undefined,
                        lan: '',
                        usedAt: undefined,
                        resetAt: undefined
                    } : b
                );
            }
        } else if (action === 'resetByLender') {
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
            const existingCodes = new Set(barcodes.map(b => b.code));
            let nextId = barcodes.length > 0 ? Math.max(...barcodes.map(b => parseInt(b.id))) + 1 : 1;

            for (const nb of newBarcodes) {
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
        res.json({ success: true, barcodes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3005;
app.listen(PORT, () => {
    console.log(`Barcode standalone backend running on port ${PORT}`);
});
