import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { parseCSVFile, ParsedCSV, CsvRow } from '../utils/csvParser';
import { mapHeaders, HeaderMapping, TARGET_HEADERS } from '../utils/headerMatcher';


// Singleton worker outside the hook to prevent memory leaks during re-renders
let ML_WORKER: Worker | null = null;
const getMLWorker = () => {
    if (typeof window !== 'undefined' && !ML_WORKER) {
        ML_WORKER = new Worker(new URL('../utils/mlWorker', import.meta.url), { type: 'module' });
    }
    return ML_WORKER;
};

export function useCSVMapping() {
    const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
    const [mappings, setMappings] = useState<HeaderMapping[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPhysical, setIsPhysical] = useState(false);
    const [physicalLenderName, setPhysicalLenderName] = useState<string>('');
    const [allowDuplicateBarcodes, setAllowDuplicateBarcodes] = useState(false);
    const [isConsolidated, setIsConsolidated] = useState(false);
    const lastSyncedRef = useRef<string>('');
    const [customTargetHeaders, setCustomTargetHeaders] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('csvMapping_customTargetHeaders');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) return parsed;
                } catch (e) { console.error("Failed to load custom headers", e); }
            }
        }
        return [];
    });
    const [deletedTargetHeaders, setDeletedTargetHeaders] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('csvMapping_deletedTargetHeaders');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) return parsed;
                } catch (e) { console.error("Failed to load deleted headers", e); }
            }
        }
        return [];
    });
    const [fetchedBarcodes, setFetchedBarcodes] = useState<any[] | null>(null);

    // Active Learning Memory
    const [learnedMappings, setLearnedMappings] = useState<Record<string, string>>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('csvMapping_learnedMappings');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (typeof parsed === 'object' && parsed !== null) return parsed;
                } catch (e) { console.error("Failed to load learned mappings", e); }
            }
        }
        return {};
    });

    const [mlReady, setMlReady] = useState(false);
    const [mlProgress, setMlProgress] = useState<any>(null);

    // Initialize Web Worker Singleton
    useEffect(() => {
        const worker = getMLWorker();
        if (worker) {
            const onMessage = (event: MessageEvent) => {
                const { status, data, error } = event.data;
                switch (status) {
                    case 'progress':
                        setMlProgress(data);
                        break;
                    case 'ready':
                        setMlReady(true);
                        setMlProgress(null);
                        break;
                    case 'error':
                        console.error('ML Worker Error:', error);
                        toast.error('Failed to initialize ML model.');
                        break;
                }
            };

            worker.addEventListener('message', onMessage);
            // Start loading the model if it's not already ready
            if (!mlReady) {
                worker.postMessage({ action: 'loadModel' });
            }

            return () => {
                worker.removeEventListener('message', onMessage);
            };
        }
    }, [mlReady]);



    // Persistence Logic (Save on change)
    useEffect(() => {
        localStorage.setItem('csvMapping_customTargetHeaders', JSON.stringify(customTargetHeaders));
    }, [customTargetHeaders]);

    useEffect(() => {
        localStorage.setItem('csvMapping_deletedTargetHeaders', JSON.stringify(deletedTargetHeaders));
    }, [deletedTargetHeaders]);

    useEffect(() => {
        localStorage.setItem('csvMapping_learnedMappings', JSON.stringify(learnedMappings));
    }, [learnedMappings]);

    const mappedTargetHeaders = Array.from(
        new Set(mappings.map(m => m.targetHeader).filter(Boolean) as string[])
    );

    const allTargetHeaders = Array.from(
        new Set([...TARGET_HEADERS, ...customTargetHeaders, ...mappedTargetHeaders])
    ).filter(header => !deletedTargetHeaders.includes(header));

    // Sync targets with ML worker whenever they change
    useEffect(() => {
        const worker = getMLWorker();
        if (worker && mlReady) {
            worker.postMessage({
                action: 'updateTargets',
                payload: { targets: allTargetHeaders }
            });
        }
    }, [allTargetHeaders, mlReady]);

    const activeMappings = mappings.filter(m => m.targetHeader !== null);

    // Computed processed data including consolidation and DPD logic
    const processedData = useMemo(() => {
        if (!parsedData) return null;

        // 1. Split Name Logic (New Feature)
        const fullNameMapping = activeMappings.find(m => m.targetHeader?.toLowerCase() === 'name');
        
        // Use shallow map for cloning to avoid deep copy bottlenecks on large datasets
        let data = parsedData.data.map(row => ({ ...row })) as CsvRow[];
        let headers = [...parsedData.headers];

        if (fullNameMapping) {
            let maxCoBorrowers = 0;
            data.forEach((row: CsvRow) => {
                const rawName = row[fullNameMapping.sourceHeader];
                if (typeof rawName === 'string') {
                    // Split by " and ", " And ", " AND ", " / ", "/", "\"
                    // Use regex that handles variations of "and" with spaces, and slashes
                    // Also handle & symbol if user wants, but stick to requested: "and", "/", "\"
                    const parts = rawName.split(/ and | And | AND | \/ |\/| \\ |\\/g).map(s => s.trim()).filter(s => s !== '');

                    if (parts.length > 1) {
                        row[fullNameMapping.sourceHeader] = parts[0]; // First name stays
                        for (let i = 1; i < parts.length; i++) {
                            const colName = `Co-Borrower ${i}`;
                            row[colName] = parts[i];
                            if (i > maxCoBorrowers) maxCoBorrowers = i;
                        }
                    }
                }
            });

            // Add new headers if needed
            for (let i = 1; i <= maxCoBorrowers; i++) {
                const colName = `Co-Borrower ${i}`;
                if (!headers.includes(colName)) headers.push(colName);
            }
        }

        // 1.5 Format Phone Numbers (12 digit -> 10 digit)
        const allPhoneMappings = activeMappings.filter(m =>
            m.targetHeader?.toLowerCase().includes('phone') ||
            m.targetHeader?.toLowerCase().includes('mobile')
        );

        if (allPhoneMappings.length > 0) {
            data.forEach((row: CsvRow) => {
                allPhoneMappings.forEach(mapping => {
                    const rawVal = row[mapping.sourceHeader];
                    if (rawVal) {
                        const digits = String(rawVal).replace(/\D/g, '');
                        if (digits.length === 12) {
                            row[mapping.sourceHeader] = digits.substring(2);
                        }
                    }
                });
            });
        }

        // 2. Identify Phone Mapping for Grouping
        const phoneMapping = allPhoneMappings[0];

        // 3. Data Consolidation (Row Merging & Pivoting)
        if (isConsolidated && phoneMapping) {
            const groups: Record<string, any[]> = {};

            // Group rows
            data.forEach((row: CsvRow) => {
                const rawPhone = row[phoneMapping.sourceHeader];
                const phone = rawPhone ? String(rawPhone).replace(/\D/g, '') : '';

                if (phone.length > 5) {
                    if (!groups[phone]) groups[phone] = [];
                    groups[phone].push(row);
                } else {
                    const uniqueKey = `__no_phone_${Math.random()}`;
                    groups[uniqueKey] = [row];
                }
            });

            const consolidatedRows: any[] = [];

            // Analyze ALL columns to find max pivot counts across ALL groups
            const columnPivotCounts: Record<string, number> = {};

            // Initialize counts
            headers.forEach(h => columnPivotCounts[h] = 0);

            // First pass: Determine max pivot count for each header
            Object.values(groups).forEach(groupRows => {
                if (groupRows.length <= 1) return;

                parsedData.headers.forEach(header => {
                    // Skip the phone number column itself from pivoting
                    if (header === phoneMapping.sourceHeader) return;

                    // If a column is explicitly skipped (mapped to null), ignore it from pivoting logic
                    const mapping = mappings.find(m => m.sourceHeader === header);
                    if (mapping && mapping.targetHeader === null) return;

                    // 'sno' column should not be pivoted into multiple columns
                    const isSno = header.toLowerCase() === 'sno' || header.toLowerCase() === 's.no' || header.toLowerCase() === 'sr no' || header.toLowerCase() === 'serial number';

                    const values = groupRows
                        .map(r => r[header])
                        .filter(v => v !== undefined && v !== null && String(v).trim() !== '');
                    const uniqueValues = [...new Set(values)];

                    // Only count unique non-empty values
                    if (uniqueValues.length > 0) {
                        let potentialCount = uniqueValues.length;
                        // Force max pivot count to 1 for sno columns so they don't spawn sno 2, sno 3
                        if (isSno) potentialCount = 1;

                        if (potentialCount > (columnPivotCounts[header] || 0)) {
                            columnPivotCounts[header] = potentialCount;
                        }
                    }
                });
            });

            // Second pass: Construct rows
            Object.values(groups).forEach((groupRows) => {
                const baseRow: any = {};

                // If single row, just copy it (but structure must match global headers concept)
                // Actually, if single row, we still need to respect the renaming if we want consistency?
                // The user said "if there is multiple unique... rename to LRN1, LRn2"
                // If unique is 1, it stays as original header (which is mapped to LRN)

                if (groupRows.length === 1) {
                    const r = groupRows[0];
                    headers.forEach(h => {
                        const count = columnPivotCounts[h] || 0;
                        if (count > 1) {
                            const mapping = activeMappings.find(m => m.sourceHeader === h);
                            const baseName = mapping?.targetHeader || h;
                            baseRow[baseName] = r[h];
                        } else {
                            baseRow[h] = r[h];
                        }
                    });
                } else {
                    const firstRow = groupRows[0];

                    headers.forEach(header => {
                        if (header === phoneMapping.sourceHeader) {
                            baseRow[header] = firstRow[header];
                            return;
                        }

                        const values = groupRows
                            .map(r => r[header])
                            .filter(v => v !== undefined && v !== null && String(v).trim() !== '');
                        const uniqueValues = [...new Set(values)];

                        const maxCount = columnPivotCounts[header] || 0;

                        if (maxCount > 1) {
                            // This column is pivoted globally.
                            // Determine the base name: Use Target Header if available, else Source Header
                            const mapping = activeMappings.find(m => m.sourceHeader === header);
                            const baseName = mapping?.targetHeader || header;

                            uniqueValues.forEach((val, i) => {
                                const colName = i === 0 ? baseName : `${baseName} ${i + 1}`;
                                baseRow[colName] = val;
                            });
                        } else {
                            // Not pivoted. Keep original source header key.
                            // The mapping LRN -> Anchor_invoice_id will still apply to this source header.
                            if (uniqueValues.length > 0) {
                                baseRow[header] = uniqueValues[0];
                            } else {
                                baseRow[header] = '';
                            }
                        }
                    });
                }

                // --- Total Outstanding Calculation (Consolidated) ---
                const outstandingMapping = activeMappings.find(m =>
                    (m.targetHeader?.toLowerCase() === 'outstanding amount' ||
                        m.targetHeader?.toLowerCase().includes('outstanding')) &&
                    headers.includes(m.sourceHeader)
                );

                if (outstandingMapping) {
                    let total = 0;
                    groupRows.forEach(r => {
                        const rawVal = r[outstandingMapping.sourceHeader];
                        const cleanVal = String(rawVal || '0').replace(/[^0-9.]/g, '');
                        const val = parseFloat(cleanVal);
                        if (!isNaN(val)) total += val;
                    });
                    baseRow['Total Outstanding (Auto)'] = total.toFixed(2);
                }

                consolidatedRows.push(baseRow);
            });

            // Assign sequential 'sno' values after consolidation
            let currentSno = 1;
            const finalConsolidatedRows = consolidatedRows.map(row => {
                const newRow = { ...row };
                // Find keys that correspond to 'sno'
                Object.keys(newRow).forEach(key => {
                    if (key.toLowerCase() === 'sno' || key.toLowerCase() === 's.no' || key.toLowerCase() === 'sr no' || key.toLowerCase() === 'serial number') {
                        newRow[key] = currentSno;
                    }
                });
                currentSno++;
                return newRow;
            });

            data = finalConsolidatedRows;

            // Update headers to include new pivoted columns
            const newHeaders: string[] = [];
            headers.forEach(header => {
                // If the column is marked skipped, it should not appear
                const mapping = mappings.find(m => m.sourceHeader === header);
                if (mapping && mapping.targetHeader === null) return;

                const count = columnPivotCounts[header] || 0;

                if (count > 1) {
                    // Use target name if available and pivot
                    const mapping = activeMappings.find(m => m.sourceHeader === header);
                    const baseName = mapping?.targetHeader || header;

                    for (let i = 1; i <= count; i++) {
                        newHeaders.push(i === 1 ? baseName : `${baseName} ${i}`);
                    }
                } else if (count === 1) {
                    newHeaders.push(header);
                }
                // If count === 0, the column is entirely empty across all groups, so we exclude it from headers
            });

            // Add generated total if exists
            if (data.some((r: any) => r['Total Outstanding (Auto)'])) {
                newHeaders.push('Total Outstanding (Auto)');
            }

            // FILTER: Hide columns that are completely empty in the consolidated dataset
            // "Run in backend" -> Data is still in rows (if any), but headers are removed so UI hides them.
            // Exception: Keep 'Notice (Auto)' and 'Total Outstanding (Auto)' if they were added (which they are only if they exist)
            // Exception: Keep original source headers if they are part of the key structure? 
            // Actually, if a source header has no data in ANY row, it's useless to show.

            headers = newHeaders.filter(h => {
                // Return true if AT LEAST ONE row has a non-empty value for this header
                return data.some((row: any) => {
                    const val = row[h];
                    return val !== undefined && val !== null && String(val).trim() !== '';
                });
            });
        }
        else if (!isConsolidated && phoneMapping) {
            // ... [Previous specific Data Consolidation Logic - Fill Missing] ...
            const groups: Record<string, number[]> = {};
            data.forEach((row: any, index: number) => {
                const rawPhone = row[phoneMapping.sourceHeader];
                const phone = rawPhone ? String(rawPhone).replace(/\D/g, '') : '';
                if (phone.length > 5) {
                    if (!groups[phone]) groups[phone] = [];
                    groups[phone].push(index);
                }
            });

            const groupValues = Object.values(groups);
            const targetMappingsToConsolidate = activeMappings.filter(m => {
                const h = m.targetHeader?.toLowerCase() || '';
                return (
                    h === 'name' ||
                    h === 'acm name' ||
                    h.includes('name') ||
                    h === 'state' ||
                    h.includes('state')
                );
            });

            if (targetMappingsToConsolidate.length > 0) {
                groupValues.forEach((indices: number[]) => {
                    if (indices.length > 1) {
                        targetMappingsToConsolidate.forEach((mapping: HeaderMapping) => {
                            let bestValue = '';
                            for (const idx of indices) {
                                const val = data[idx][mapping.sourceHeader];
                                if (val !== undefined && val !== null && String(val).trim()) {
                                    bestValue = String(val).trim();
                                    break;
                                }
                            }
                            if (bestValue) {
                                indices.forEach((idx: number) => {
                                    const currentVal = data[idx][mapping.sourceHeader];
                                    if (currentVal === undefined || currentVal === null || !String(currentVal).trim()) {
                                        data[idx][mapping.sourceHeader] = bestValue;
                                    }
                                });
                            }
                        });
                    }
                });
            }

            // Compute Total Outstanding (Non-Consolidated)
            const outstandingMapping = activeMappings.find(m =>
                (m.targetHeader?.toLowerCase() === 'outstanding amount' ||
                    m.targetHeader?.toLowerCase().includes('outstanding')) &&
                parsedData.headers.includes(m.sourceHeader)
            );

            if (outstandingMapping) {
                groupValues.forEach(indices => {
                    let total = 0;
                    indices.forEach(idx => {
                        const rawVal = data[idx][outstandingMapping.sourceHeader];
                        const cleanVal = String(rawVal || '0').replace(/[^0-9.]/g, '');
                        const val = parseFloat(cleanVal);
                        if (!isNaN(val)) total += val;
                    });

                    indices.forEach(idx => {
                        (data[idx] as any)['Total Outstanding (Auto)'] = total.toFixed(2);
                    });
                });
                if (!headers.includes('Total Outstanding (Auto)')) {
                    headers.push('Total Outstanding (Auto)');
                }
            }
        }

        // 3. DPD Logic (Compute Notice)
        const dpdMapping = activeMappings.find(m => m.targetHeader?.toLowerCase() === 'dpd');
        if (dpdMapping) {
            data = data.map((row: CsvRow) => {
                const rawDpd = row[dpdMapping.sourceHeader];
                const dpdVal = typeof rawDpd === 'number' ? rawDpd : parseInt(String(rawDpd || 0), 10);
                const noticeVal = !isNaN(dpdVal) && dpdVal > 60 ? 'LRN' : 'LDN';
                return { ...row, 'Notice (Auto)': noticeVal };
            });
            if (!headers.includes('Notice (Auto)')) {
                headers.push('Notice (Auto)');
            }
        }

        // 4. Barcode Generation Logic (Physical Mode)
        if (isPhysical) {
            const phoneMapping = activeMappings.find(m =>
                m.targetHeader?.toLowerCase().includes('phone') ||
                m.targetHeader?.toLowerCase().includes('mobile')
            );

            // Find if there's an explicit mapping to "barcode"
            const barcodeMapping = activeMappings.find(m =>
                m.targetHeader?.toLowerCase() === 'barcode'
            );

            // Check if every row has a mapped barcode available
            const allRowsHaveBarcode = barcodeMapping && data.every((row: CsvRow) => {
                const val = row[barcodeMapping.sourceHeader];
                return val !== undefined && val !== null && String(val).trim() !== '';
            });

            // If the user mapped a barcode column and it has data, don't create an "Auto" one
            if (barcodeMapping && allRowsHaveBarcode) {
                // We do nothing, the mapped barcode column suffices
            } else {
                const finalAssignmentMap: Record<string, string> = {};
                let nextBarcodeIdx = 0;

                const lanMapping = activeMappings.find(m =>
                    m.targetHeader?.toLowerCase().includes('lan') ||
                    m.targetHeader?.toLowerCase().includes('loan')
                );

                data = data.map((row: CsvRow) => {
                    let barcodeVal = '';

                    // 1. Check if the row already has a barcode from the source
                    const existingBc = barcodeMapping ? row[barcodeMapping.sourceHeader] : undefined;
                    if (barcodeMapping && existingBc && String(existingBc).trim()) {
                        barcodeVal = String(existingBc).trim();
                    }
                    // 2. Otherwise use fetched barcodes
                    else if (!fetchedBarcodes) {
                        barcodeVal = 'Loading...';
                    } else if (fetchedBarcodes.length === 0) {
                        barcodeVal = 'No Barcode Available';
                    } else {
                        const rawPhone = phoneMapping ? row[phoneMapping.sourceHeader] : '';
                        const phone = rawPhone ? String(rawPhone).replace(/\D/g, '') : '';
                        const lan = lanMapping ? String(row[lanMapping.sourceHeader] || '').trim() : '';

                        // Logic for Duplicate (Grouped) or Unique Barcodes
                        if (allowDuplicateBarcodes && (phone.length >= 10 || lan.length > 0)) {
                            // Create a composite key if both exist, otherwise use one
                            const key = phone && lan ? `${phone}_${lan}` : (phone || lan);

                            if (finalAssignmentMap[key]) {
                                barcodeVal = finalAssignmentMap[key];
                            } else {
                                if (nextBarcodeIdx < fetchedBarcodes.length) {
                                    const bc = fetchedBarcodes[nextBarcodeIdx++];
                                    finalAssignmentMap[key] = bc.code;
                                    barcodeVal = bc.code;
                                } else {
                                    barcodeVal = 'No Barcode Available';
                                }
                            }
                        } else {
                            // Default: Unique Barcode for every row (or if not allowDuplicateBarcodes)
                            if (nextBarcodeIdx < fetchedBarcodes.length) {
                                const bc = fetchedBarcodes[nextBarcodeIdx++];
                                barcodeVal = bc.code;
                            } else {
                                barcodeVal = 'No Barcode Available';
                            }
                        }
                    }
                    return { ...row, 'Barcode (Auto)': barcodeVal };
                });

                if (!headers.includes('Barcode (Auto)')) {
                    headers.push('Barcode (Auto)');
                }
            }
        }

        // 5. Language Generation Logic
        // 5. Language Generation Logic
        // Check if any USER header maps to language1 (excluding our auto generated one to prevent loops)
        const hasUserMappedLang1 = activeMappings.some(m =>
            m.targetHeader === 'language1' && m.sourceHeader !== 'language1 (Auto)'
        );

        // Check if user explicitly SKIPPED the auto-generated columns (mapped to null)
        // If they skipped it, we should NOT generate it (delete it effectively)
        const isLang1Skipped = mappings.some(m => m.sourceHeader === 'language1 (Auto)' && m.targetHeader === null);
        const isLang2Skipped = mappings.some(m => m.sourceHeader === 'language2 (Auto)' && m.targetHeader === null);

        // Or if source has "language" in it
        const hasSourceLanguage = headers.some(h => h.toLowerCase().includes('language'));

        if (!hasSourceLanguage && !hasUserMappedLang1) {
            // First, identify the explicitly mapped columns for state and address
            const stateMapping = activeMappings.find(m => m.targetHeader?.toLowerCase() === 'state' || m.targetHeader?.toLowerCase().includes('state'));
            const addressMapping = activeMappings.find(m => m.targetHeader?.toLowerCase() === 'address' || m.targetHeader?.toLowerCase().includes('address'));

            // If not explicitly mapped, fallback to finding a column with that name
            const stateHeader = stateMapping?.sourceHeader || headers.find(h => h.toLowerCase().includes('state'));
            const addressHeader = addressMapping?.sourceHeader || headers.find(h => h.toLowerCase().includes('address'));

            data = data.map((row: CsvRow) => {
                const newRow: CsvRow = { ...row, 'language1 (Auto)': 'English' };
                let lang2 = '';
                let loc = '';

                // Prioritize state header first, then address
                if (stateHeader && row[stateHeader]) loc += String(row[stateHeader]).toLowerCase() + ' ';
                if (addressHeader && row[addressHeader]) loc += String(addressHeader ? row[addressHeader] : '').toLowerCase();

                const stateLanguageMap: Record<string, string> = {
                    'maharashtra': 'Marathi', 'mh': 'Marathi', 'mah': 'Marathi',
                    'gujarat': 'Gujarati', 'gj': 'Gujarati', 'guj': 'Gujarati',
                    'tamil nadu': 'Tamil', 'tn': 'Tamil',
                    'karnataka': 'Kannada', 'ka': 'Kannada', 'kar': 'Kannada',
                    'andhra pradesh': 'Telugu', 'ap': 'Telugu',
                    'telangana': 'Telugu', 'tg': 'Telugu', 'ts': 'Telugu',
                    'west bengal': 'Bengali', 'wb': 'Bengali',
                    'punjab': 'Punjabi', 'pb': 'Punjabi',
                    'kerala': 'Malayalam', 'kl': 'Malayalam', 'ker': 'Malayalam',
                    'odisha': 'Odia', 'or': 'Odia', 'od': 'Odia',
                    'assam': 'Assamese', 'as': 'Assamese',
                    // Hindi speaking states
                    'rajasthan': 'Hindi', 'rj': 'Hindi', 'raj': 'Hindi',
                    'rajisthan': 'Hindi',
                    'uttar pradesh': 'Hindi', 'up': 'Hindi',
                    'madhya pradesh': 'Hindi', 'mp': 'Hindi',
                    'bihar': 'Hindi', 'br': 'Hindi',
                    'haryana': 'Hindi', 'hr': 'Hindi',
                    'delhi': 'Hindi', 'dl': 'Hindi',
                    'himachal pradesh': 'Hindi', 'hp': 'Hindi',
                    'uttarakhand': 'Hindi', 'uk': 'Hindi', 'ut': 'Hindi',
                    'jharkhand': 'Hindi', 'jh': 'Hindi',
                    'chhattisgarh': 'Hindi', 'cg': 'Hindi'
                };

                // Clean location string for whole-word exact matching of alpha codes
                const locWords = loc.split(/[\s,.-]+/).filter(Boolean);

                // Search location string for state names or exact word match for codes
                for (const [state, language] of Object.entries(stateLanguageMap)) {
                    // If it's a short alpha code (<= 3 chars), require an exact word match
                    // This prevents "mumbai" matching "mp" if we just did an isolated substring check
                    if (state.length <= 3) {
                        if (locWords.includes(state)) {
                            lang2 = language;
                            break;
                        }
                    } else {
                        // For names like 'maharashtra', a substring match is fine
                        if (loc.includes(state)) {
                            lang2 = language;
                            break;
                        }
                    }
                }

                if (lang2) {
                    newRow['language2 (Auto)'] = lang2;
                }
                return newRow;
            });

            // Ensure our auto-generated headers are added to the list if they exist in the data and aren't skipped
            if (!isLang1Skipped && data.some((r: any) => r['language1 (Auto)']) && !headers.includes('language1 (Auto)')) {
                headers.push('language1 (Auto)');
            }
            if (!isLang2Skipped && data.some((r: any) => r['language2 (Auto)']) && !headers.includes('language2 (Auto)')) {
                headers.push('language2 (Auto)');
            }
        }


        return {
            ...parsedData,
            data,
            headers,
        };
    }, [parsedData, mappings, isConsolidated, isPhysical, fetchedBarcodes, allowDuplicateBarcodes]);

    // Effect to fetch and sync barcodes
    useEffect(() => {
        const syncBarcodes = async () => {
            if (!isPhysical || !parsedData) return;

            // 1. Calculate Needs (inline to avoid dependency issues)
            const dataRows = parsedData?.data || [];
            const phoneMapping = activeMappings.find(m =>
                m.targetHeader?.toLowerCase().includes('phone') ||
                m.targetHeader?.toLowerCase().includes('mobile')
            );
            const barcodeMapping = activeMappings.find(m =>
                m.targetHeader?.toLowerCase() === 'barcode'
            );
            const lanMapping = activeMappings.find(m =>
                m.targetHeader?.toLowerCase().includes('lan') ||
                m.targetHeader?.toLowerCase().includes('loan')
            );

            const uniqueKeys = new Set<string>();
            let rowsNeedingUniqueBarcode = 0;
            const phoneToLanMap: Record<string, Set<string>> = {};

            dataRows.forEach((row: any) => {
                if (barcodeMapping && row[barcodeMapping.sourceHeader]?.trim()) return;

                const rawPhone = phoneMapping ? row[phoneMapping.sourceHeader] : '';
                const phone = rawPhone ? String(rawPhone).replace(/\D/g, '') : '';
                const lan = lanMapping ? String(row[lanMapping.sourceHeader] || '').trim() : '';

                if (allowDuplicateBarcodes && (phone.length >= 10 || lan.length > 0)) {
                    const key = phone && lan ? `${phone}_${lan}` : (phone || lan);
                    uniqueKeys.add(key);
                    if (phone.length >= 10) {
                        if (!phoneToLanMap[phone]) phoneToLanMap[phone] = new Set();
                        if (lan) phoneToLanMap[phone].add(lan);
                    }
                } else {
                    rowsNeedingUniqueBarcode++;
                }
            });

            const totalNeeded = uniqueKeys.size + rowsNeedingUniqueBarcode;

            // Current metadata signature to detect changes
            const currentMetadata = JSON.stringify({
                lender: physicalLenderName,
                duplicates: allowDuplicateBarcodes,
                total: totalNeeded,
                mapping: activeMappings.map(m => m.targetHeader).join(',')
            });

            const info = { dataRows, phoneMapping, lanMapping, barcodeMapping, phoneToLanMap };

            // 2. If we need new barcodes, fetch them first
            if (!fetchedBarcodes || fetchedBarcodes.length < totalNeeded) {
                if (totalNeeded === 0) return;

                console.log("Fetching barcodes from portal, count:", totalNeeded);
                try {
                    const res = await fetch(`${import.meta.env.VITE_BARCODE_PORTAL_URL}/api/barcodes?status=available&count=${totalNeeded}`);
                    if (!res.ok) throw new Error("Failed to fetch");
                    const barcodes = await res.json();
                    if (Array.isArray(barcodes)) {
                        setFetchedBarcodes(barcodes);
                        performSync(barcodes, info, currentMetadata);
                    }
                } catch (err) {
                    console.error("Barcode fetch failed", err);
                    toast.error("Could not fetch barcodes from portal");
                    setFetchedBarcodes([]);
                }
            } else if (currentMetadata !== lastSyncedRef.current) {
                // 3. We already have barcodes, but metadata changed - RE-SYNC
                performSync(fetchedBarcodes, info, currentMetadata);
            }
        };

        const performSync = (barcodes: any[], info: any, metadata: string) => {
            const { dataRows, phoneMapping, lanMapping, barcodeMapping, phoneToLanMap } = info;
            const updates: any[] = [];
            const assignmentMap: Record<string, any> = {};
            let nextBarcodeIdx = 0;

            dataRows.forEach((row: any) => {
                if (barcodeMapping && row[barcodeMapping.sourceHeader]?.trim()) return;

                const rawPhone = phoneMapping ? row[phoneMapping.sourceHeader] : '';
                const phone = rawPhone ? String(rawPhone).replace(/\D/g, '') : '';
                const lan = lanMapping ? String(row[lanMapping.sourceHeader] || '').trim() : '';

                if (allowDuplicateBarcodes && (phone.length >= 10 || lan.length > 0)) {
                    const key = phone && lan ? `${phone}_${lan}` : (phone || lan);
                    if (!assignmentMap[key]) {
                        if (nextBarcodeIdx < barcodes.length) {
                            const bc = barcodes[nextBarcodeIdx++];
                            assignmentMap[key] = bc;
                            const lanStr = phoneToLanMap[phone] ? Array.from(phoneToLanMap[phone]).join(', ') : lan;
                            updates.push({ id: bc.id, lenderName: phone || 'Mixed', lan: lanStr || 'N/A', bankName: physicalLenderName });
                        }
                    }
                } else {
                    if (nextBarcodeIdx < barcodes.length) {
                        const bc = barcodes[nextBarcodeIdx++];
                        updates.push({ id: bc.id, lenderName: phone || 'Unknown', lan: lan || 'N/A', bankName: physicalLenderName });
                    }
                }
            });

            if (updates.length > 0) {
                console.log("Marking barcodes as used in portal:", updates.length);
                fetch(`${import.meta.env.VITE_BARCODE_PORTAL_URL}/api/barcodes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'markUsed', updates })
                })
                    .then(async response => {
                        if (!response.ok) throw new Error("Sync failed");
                        lastSyncedRef.current = metadata;
                        console.log("Barcode portal updated successfully");
                        toast.success(`Successfully synced ${updates.length} barcodes`);
                        
                        // 1. Broadcast to other tabs
                        if (typeof window !== 'undefined') {
                            const bc = new BroadcastChannel('barcode_sync');
                            bc.postMessage('refresh');
                            bc.close();
                            
                            // 2. Also try window messages for good measure (frame cases)
                            window.parent.postMessage({ type: 'RELOAD_APP', appId: 'barcode' }, '*');
                            window.parent.postMessage({ type: 'APP_RELOAD', appId: 'barcode' }, '*');
                        }
                    })
                    .catch(err => {
                        console.error("Barcode portal update failed", err);
                        toast.error("Failed to update barcode in portal");
                    });
            }
        };

        syncBarcodes();
    }, [isPhysical, parsedData, activeMappings, physicalLenderName, allowDuplicateBarcodes, fetchedBarcodes]);

    useEffect(() => {
        if (!isPhysical) {
            setFetchedBarcodes(null);
            lastSyncedRef.current = '';
        }
    }, [isPhysical]);

    // Sync generated headers to mappings so they appear in Preview/Export
    useEffect(() => {
        if (!processedData) return;

        // Expanded logic: Detect ANY column ending in " \d+" that matches an original header OR a target header
        // Since we now rename to target header (e.g. LRN 1), we must check if "LRN" is a known target.
        const generatedSourceHeaders = processedData.headers.filter(header => {
            if (header.includes('(Auto)')) return true;
            if (header.includes('Co-Borrower')) return true;

            // Generic Check: Ends with digit?
            const match = header.match(/^(.*) (\d+)$/);
            if (match) {
                const baseName = match[1];

                // 1. Is it an original source header?
                if (parsedData?.headers.includes(baseName)) return true;

                // 2. Is it a mapped TARGET header from the original mappings?
                const isTarget = mappings.some(m => m.targetHeader === baseName && parsedData?.headers.includes(m.sourceHeader));
                if (isTarget) return true;
            }
            return false;
        });

        setMappings(prevMappings => {
            let updatedMappings = [...prevMappings];
            let changed = false;

            generatedSourceHeaders.forEach(genHeader => {
                // Check if this generated header already has a mapping entry
                // Note: genHeader is now "LRN 1"
                const existingMapping = updatedMappings.find(m => m.sourceHeader === genHeader);

                if (!existingMapping) {

                    let defaultTarget = genHeader;
                    if (genHeader === 'Notice (Auto)') defaultTarget = 'notice';
                    if (genHeader === 'Total Outstanding (Auto)') defaultTarget = 'total outstanding amt';
                    if (genHeader === 'Barcode (Auto)') defaultTarget = 'barcode';
                    if (genHeader === 'language1 (Auto)') defaultTarget = 'language1';
                    if (genHeader === 'language2 (Auto)') defaultTarget = 'language2';

                    // If genHeader is "LRN 1", defaultTarget should probably be "LRN 1"
                    // because the user wants to see "LRN 1", "LRN 2" in the final export?
                    // OR do they want to map "LRN 1" back to "LRN"? No, multiple columns can't map to same target usually.
                    // So auto-mapping to itself (identity) is correct for these dynamic columns.

                    updatedMappings.push({
                        sourceHeader: genHeader,
                        targetHeader: defaultTarget,
                        confidence: 0.95,
                    });
                    changed = true;
                }
            });

            // Cleanup logic
            updatedMappings = updatedMappings.filter(m => {
                // Keep if it exists in current headers
                if (processedData.headers.includes(m.sourceHeader)) return true;

                // SPECIAL KEEP: If it's an Auto header that is explicitly skipped (null), keep it so useMemo knows to suppress it.
                if (m.sourceHeader.includes('(Auto)') && m.targetHeader === null) return true;

                // Remove if it looks like a generated header (ends in number or (Auto))
                if (m.sourceHeader.includes('(Auto)')) return false;

                const match = m.sourceHeader.match(/^(.*) (\d+)$/);
                if (match) {
                    const baseName = match[1];
                    // If it matches pattern AND base was valid source or target, it was likely a pivot
                    if (parsedData?.headers.includes(baseName)) return false; // Source base

                    const isTarget = mappings.some(map => map.targetHeader === baseName && parsedData?.headers.includes(map.sourceHeader));
                    if (isTarget) return false; // Target base
                }

                return true; // Keep others
            });

            if (updatedMappings.length !== prevMappings.length) changed = true;


            return changed ? updatedMappings : prevMappings;
        });
    }, [processedData]);


    const handleConsolidationToggle = () => {
        setIsConsolidated(prev => !prev);
    };


    const handleFileUpload = async (file: File) => {
        setIsProcessing(true);
        try {
            const parsed = await parseCSVFile(file);

            // Extract data samples for content-based mapping
            const dataSamples: Record<string, string[]> = {};
            parsed.headers.forEach(header => {
                const samples: string[] = [];
                for (let i = 0; i < Math.min(parsed.data.length, 20); i++) {
                    const val = parsed.data[i][header];
                    if (val && String(val).trim() !== '') {
                        samples.push(String(val).trim());
                        if (samples.length >= 5) break;
                    }
                }
                dataSamples[header] = samples;
            });

            const newCustomHeaders: string[] = [];

            // AI-based mapping using Gemini (Backend) with Local Worker as Fallback
            let rawMappings: any[] = [];
            const aiPortalUrl = import.meta.env.VITE_AI_PORTAL_URL || 'http://localhost:8000';

            try {
                console.log("Attempting Gemini Mapping via Backend...");
                const response = await fetch(`${aiPortalUrl}/map`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        placeholders: parsed.headers, // The backend calls it placeholders but it uses it as source columns
                        source_columns: parsed.headers
                    })
                });

                if (response.ok) {
                    const geminiResults = await response.json();
                    // Transform Gemini results into the format expected by the frontend
                    rawMappings = geminiResults.map((m: any) => ({
                        source_column: m.placeholder,
                        predicted_target: m.suggested_column,
                        confidence_score: m.confidence
                    }));
                    console.log("Gemini Mapping Successful.");
                } else {
                    throw new Error("Backend mapping failed");
                }
            } catch (err) {
                console.log("Gemini/Backend mapping failed, falling back to local ML worker:", err);
                rawMappings = await new Promise((resolve) => {
                    const worker = getMLWorker();
                    if (!worker || !mlReady) {
                        console.log("ML not ready, falling back to heuristic matching");
                        resolve(mapHeaders(parsed.headers, [...TARGET_HEADERS, ...customTargetHeaders], dataSamples));
                        return;
                    }

                    const msgHandler = (event: MessageEvent) => {
                        const { status, data, error } = event.data;
                        if (status === 'complete') {
                            worker.removeEventListener('message', msgHandler);
                            resolve(data.mappings);
                        } else if (status === 'error') {
                            worker.removeEventListener('message', msgHandler);
                            console.error("ML Error:", error);
                            // Fallback to Heuristics
                            resolve(mapHeaders(parsed.headers, [...TARGET_HEADERS, ...customTargetHeaders], dataSamples));
                        }
                    };

                    worker.addEventListener('message', msgHandler);
                    worker.postMessage({
                        action: 'mapColumns',
                        payload: { columns: parsed.headers }
                    });
                });
            }

            let autoMappings: HeaderMapping[] = [];
            if (rawMappings.length > 0 && typeof rawMappings[0].predicted_target !== 'undefined') {
                // Transform ML results
                autoMappings = rawMappings.map((m: any) => {
                    // Active Learning Memory Override
                    const knownCorrection = learnedMappings[m.source_column];
                    if (knownCorrection) {
                        return {
                            sourceHeader: m.source_column,
                            targetHeader: knownCorrection === '__SKIPPED__' ? null : knownCorrection,
                            confidence: 1.0 // 100% confidence because the user taught it this
                        }
                    }

                    return {
                        sourceHeader: m.source_column,
                        targetHeader: m.confidence_score >= 0.4 ? m.predicted_target : null,
                        confidence: m.confidence_score
                    };
                });
            } else {
                // Fallback processing
                autoMappings = rawMappings.map((m: any) => {
                    const knownCorrection = learnedMappings[m.sourceHeader];
                    if (knownCorrection) {
                        return { ...m, targetHeader: knownCorrection === '__SKIPPED__' ? null : knownCorrection, confidence: 1.0 };
                    }
                    return m;
                });
            }

            const autoNumberedColumns: string[] = [];
            const targetUsageCount: Record<string, number> = {};
            const finalMappingsMap: Record<string, any> = {};

            // PASS 1: Guarantee slots for Learned Mappings (confidence === 1.0)
            autoMappings.forEach((match) => {
                if (match.confidence === 1.0 && match.targetHeader !== null) {
                    const targetHeader = match.targetHeader;
                    const tlower = targetHeader.toLowerCase();
                    const isMultiColumn = tlower.includes('co_borrower') || tlower.includes('co-borrower') || tlower === 'lan';

                    if (!targetUsageCount[targetHeader]) {
                        targetUsageCount[targetHeader] = 1;
                        finalMappingsMap[match.sourceHeader] = { ...match, targetHeader };
                    } else if (isMultiColumn) {
                        targetUsageCount[targetHeader]++;
                        const num = targetUsageCount[targetHeader];
                        const newTarget = `${targetHeader} ${num}`;

                        if (!autoNumberedColumns.includes(targetHeader)) autoNumberedColumns.push(targetHeader);
                        const allCurrent = [...TARGET_HEADERS, ...customTargetHeaders, ...newCustomHeaders];
                        if (!allCurrent.includes(newTarget)) newCustomHeaders.push(newTarget);

                        finalMappingsMap[match.sourceHeader] = { ...match, targetHeader: newTarget };
                    } else {
                        // Edge case: Multiple learned mappings point to the same singular column
                        // Keep the first one, skip the second one
                        finalMappingsMap[match.sourceHeader] = { ...match, targetHeader: null, confidence: 0 };
                    }
                }
            });

            // PASS 2: Assign slots for standard ML predictions (confidence < 1.0)
            autoMappings.forEach((match) => {
                if (match.confidence < 1.0 || match.targetHeader === null) {
                    let targetHeader = match.targetHeader;
                    let confidence = match.confidence;

                    if (targetHeader !== null) {
                        const tlower = targetHeader.toLowerCase();
                        const isMultiColumn = tlower.includes('co_borrower') || tlower.includes('co-borrower') || tlower === 'lan';

                        if (!targetUsageCount[targetHeader]) {
                            targetUsageCount[targetHeader] = 1;
                        } else {
                            if (isMultiColumn) {
                                targetUsageCount[targetHeader]++;
                                const num = targetUsageCount[targetHeader];
                                const originalTarget = targetHeader;
                                targetHeader = `${originalTarget} ${num}`;
                                confidence = 0.9;

                                if (!autoNumberedColumns.includes(originalTarget)) autoNumberedColumns.push(originalTarget);
                                const allCurrent = [...TARGET_HEADERS, ...customTargetHeaders, ...newCustomHeaders];
                                if (!allCurrent.includes(targetHeader)) newCustomHeaders.push(targetHeader);
                            } else {
                                // Target is already used (likely claimed by a learned mapping in Pass 1). Skip it.
                                targetHeader = null;
                                confidence = 0;
                            }
                        }
                    }

                    finalMappingsMap[match.sourceHeader] = {
                        sourceHeader: match.sourceHeader,
                        targetHeader,
                        confidence,
                    };
                }
            });

            // Reconstruct the array in original order
            const initialMappings = autoMappings.map(match => finalMappingsMap[match.sourceHeader]);

            // Append Computed "Source" Columns
            initialMappings.push({
                sourceHeader: 'Notice (Auto)',
                targetHeader: 'notice',
                confidence: 0.9
            });

            initialMappings.push({
                sourceHeader: 'Total Outstanding (Auto)',
                targetHeader: 'total outstanding amt',
                confidence: 0.9
            });

            if (newCustomHeaders.length > 0) {
                setCustomTargetHeaders(prev => [...prev, ...newCustomHeaders]);
            }

            setParsedData(parsed);
            setMappings(initialMappings);

            const mappedCount = initialMappings.filter(m => m.targetHeader !== null).length;
            toast.success(`CSV processed! ${mappedCount} of ${parsed.headers.length} columns automatically mapped.`);

            if (autoNumberedColumns.length > 0) {
                toast.info(`Detected multiple columns hitting the same targets (${autoNumberedColumns.join(', ')}). They have been automatically numbered to prevent overwriting.`);
            }

        } catch (error) {
            console.error('Error parsing CSV:', error);
            toast.error('Failed to parse CSV file. Please check the file format.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMappingChange = (index: number, newTarget: string | null) => {
        setMappings((prev) => {
            const updated = [...prev];
            const sourceHeaderStr = updated[index].sourceHeader;

            // Teach the model what the correct target is for this source header
            // If the user skipped it (null), remember that as well
            setLearnedMappings(prevLearning => ({
                ...prevLearning,
                [sourceHeaderStr]: newTarget === null ? '__SKIPPED__' : newTarget
            }));

            if (newTarget !== null) {
                const validTarget: string = newTarget;

                // Check for duplicates
                const isDuplicateMatch = (target: string, search: string) => {
                    if (target === search) return true;
                    if (target.startsWith(search)) {
                        return /^\d+$/.test(target.slice(search.length).trim()); // Added trim for robustness
                    }
                    return false;
                };

                const existingCount = updated.filter(
                    (m, i) => i !== index && m.targetHeader && isDuplicateMatch(m.targetHeader, newTarget as string)
                ).length;

                if (existingCount > 0) {
                    const tlower = newTarget.toLowerCase();
                    const isMultiColumn = tlower.includes('co_borrower') || tlower.includes('co-borrower') || tlower === 'lan';

                    if (isMultiColumn) {
                        let counter = 1;
                        let numberedTarget = `${newTarget} ${counter}`; // Added space for consistency

                        while (updated.some((m, i) => i !== index && m.targetHeader === numberedTarget)) {
                            counter++;
                            numberedTarget = `${newTarget} ${counter}`; // Added space for consistency
                        }

                        newTarget = numberedTarget;
                        toast.info(`Duplicate column detected. Renamed to "${newTarget}"`);

                        // Add the new numbered target to available headers so the dropdown can display it
                        setCustomTargetHeaders(prevCustom => {
                            if (!prevCustom.includes(newTarget as string)) {
                                return [...prevCustom, newTarget as string];
                            }
                            return prevCustom;
                        });
                    } else {
                        toast.error(`"${newTarget}" is already mapped. You can only have multiple "co-borrower" or "lan" columns.`);
                        newTarget = null;
                    }
                }
            }

            updated[index] = {
                ...updated[index],
                targetHeader: newTarget,
                confidence: newTarget === null ? 0 : 1,
            };
            return updated;
        });
    };

    const handleTargetRename = (index: number, newName: string) => {
        setMappings((prev) => {
            const updated = [...prev];
            const existingCount = updated.filter(
                (m, i) => i !== index && m.targetHeader === newName
            ).length;

            let finalName = newName;
            if (existingCount > 0) {
                let counter = 1;
                let numberedName = `${newName}${counter}`;
                while (updated.some((m, i) => i !== index && m.targetHeader === numberedName)) {
                    counter++;
                    numberedName = `${newName}${counter}`;
                }
                finalName = numberedName;
                toast.info(`Duplicate name detected. Renamed to "${finalName}"`);
            }

            updated[index] = { ...updated[index], targetHeader: finalName };
            return updated;
        });
    };

    const handleAddCustomColumn = async (newColumnName: string) => {
        if (newColumnName.trim()) {
            const columnNames = newColumnName
                .split(',')
                .map(name => name.trim())
                .filter(name => name.length > 0);

            if (columnNames.length === 0) {
                toast.error('Please enter at least one column name');
                return false;
            }

            const uniqueColumnNames = [...new Set(columnNames)];
            const existingColumns: string[] = [];
            const newColumns: string[] = [];

            uniqueColumnNames.forEach(name => {
                if (allTargetHeaders.includes(name)) {
                    existingColumns.push(name);
                } else {
                    newColumns.push(name);
                }
            });

            if (existingColumns.length > 0) {
                toast.error(`Column(s) already exist: ${existingColumns.join(', ')}`);
            }

            if (newColumns.length > 0) {
                setCustomTargetHeaders([...customTargetHeaders, ...newColumns]);

                // Auto-map to these new columns if possible using ML
                const unmappedSources = mappings.filter(m => m.targetHeader === null).map(m => m.sourceHeader);
                const worker = getMLWorker();

                if (unmappedSources.length > 0 && worker && mlReady) {
                    const toastId = toast.loading("Analyzing new column using AI...");

                    try {
                        const rawMappings: any[] = await new Promise((resolve, reject) => {
                            const msgHandler = (event: MessageEvent) => {
                                const { status, data, error } = event.data;
                                if (status === 'complete_custom') {
                                    worker.removeEventListener('message', msgHandler);
                                    resolve(data.mappings);
                                } else if (status === 'error') {
                                    worker.removeEventListener('message', msgHandler);
                                    reject(error);
                                }
                            };

                            worker.addEventListener('message', msgHandler);
                            worker.postMessage({
                                action: 'mapToCustomTargets',
                                payload: {
                                    sources: unmappedSources,
                                    customTargets: newColumns
                                }
                            });
                        });

                        setMappings(prevMappings => {
                            const updatedMappings = [...prevMappings];
                            let autoMappedCount = 0;

                            updatedMappings.forEach((mapping, index) => {
                                if (mapping.targetHeader === null) {
                                    const mlMatch = rawMappings.find((m: any) => m.source === mapping.sourceHeader);

                                    // Use a high threshold for auto-mapping to custom columns to prevent aggressive false positives
                                    if (mlMatch && mlMatch.confidence >= 0.5) {
                                        updatedMappings[index] = {
                                            ...mapping,
                                            targetHeader: mlMatch.target,
                                            confidence: mlMatch.confidence
                                        };
                                        autoMappedCount++;
                                    }
                                }
                            });

                            toast.dismiss(toastId);
                            if (autoMappedCount > 0) {
                                toast.success(`AI automatically mapped ${autoMappedCount} column(s) to new custom header(s).`);
                            }
                            return updatedMappings;
                        });

                    } catch (error) {
                        toast.dismiss(toastId);
                        // Fallback completely
                        setMappings(prevMappings => {
                            const updatedMappings = [...prevMappings];
                            let autoMappedCount = 0;

                            updatedMappings.forEach((mapping, index) => {
                                if (mapping.targetHeader === null) {
                                    const match = mapHeaders([mapping.sourceHeader], newColumns)[0];
                                    if (match.targetHeader && match.confidence > 0.8) {
                                        updatedMappings[index] = {
                                            ...mapping,
                                            targetHeader: match.targetHeader,
                                            confidence: match.confidence
                                        };
                                        autoMappedCount++;
                                    }
                                }
                            });
                            if (autoMappedCount > 0) {
                                toast.success(`Automatically mapped ${autoMappedCount} column(s) to new custom header(s).`);
                            }
                            return updatedMappings;
                        });
                    }
                } else {
                    // Heuristic fallback if ML is broken
                    setMappings(prevMappings => {
                        const updatedMappings = [...prevMappings];
                        let autoMappedCount = 0;

                        updatedMappings.forEach((mapping, index) => {
                            if (mapping.targetHeader === null) {
                                const match = mapHeaders([mapping.sourceHeader], newColumns)[0];
                                if (match.targetHeader && match.confidence > 0.8) {
                                    updatedMappings[index] = {
                                        ...mapping,
                                        targetHeader: match.targetHeader,
                                        confidence: match.confidence
                                    };
                                    autoMappedCount++;
                                }
                            }
                        });
                        if (autoMappedCount > 0) {
                            toast.success(`Automatically mapped ${autoMappedCount} column(s) to new custom header(s).`);
                        }
                        return updatedMappings;
                    });
                }

                if (newColumns.length === 1) {
                    toast.success(`Added custom column: ${newColumns[0]}`);
                } else {
                    toast.success(`Added ${newColumns.length} custom columns: ${newColumns.join(', ')}`);
                }
            }
            return true;
        }
        return false;
    };

    const handlePhysicalToggle = (lenderName?: string, duplicateBarcodes?: boolean) => {
        const newIsPhysical = !isPhysical;
        setIsPhysical(newIsPhysical);

        if (newIsPhysical && lenderName) {
            setPhysicalLenderName(lenderName);
            if (duplicateBarcodes !== undefined) {
                setAllowDuplicateBarcodes(duplicateBarcodes);
            }
        }

        if (!newIsPhysical) {
            setPhysicalLenderName('');
            setAllowDuplicateBarcodes(false);
            setMappings((prev) =>
                prev.map((mapping) =>
                    mapping.targetHeader === 'barcode'
                        ? { ...mapping, targetHeader: null, confidence: 0 }
                        : mapping
                )
            );
            toast.info('Barcode column removed from mapping');
        } else {
            toast.success('Barcode column is now available');
        }
    };

    const handleReset = () => {
        setParsedData(null);
        setMappings([]);
        setIsPhysical(false);
        // Do not clear customTargetHeaders or deletedTargetHeaders so they persist permanently
    };

    const handleDeleteColumn = (columnName: string) => {
        setDeletedTargetHeaders((prev) => [...prev, columnName]);
        toast.info(`Column "${columnName}" removed. You can undo this in the manager.`);
    };

    const handleRestoreColumn = (columnName: string) => {
        setDeletedTargetHeaders((prev) => prev.filter(h => h !== columnName));
        toast.success(`Column "${columnName}" restored.`);
    };

    // Export Logic using processedData
    // We need to expose a way to get the final mapped rows including Notice
    const getExportData = () => {
        if (!processedData) return null;

        const activeMappings = mappings.filter(m => m.targetHeader !== null);

        const finalHeaders = new Set<string>();
        // Preserve defined order of active mappings
        activeMappings.forEach(m => finalHeaders.add(m.targetHeader!));

        const mappedRows = processedData.data.map((row: CsvRow) => {
            const newRow: Record<string, any> = {};

            Object.keys(row).forEach(key => {
                const mapping = activeMappings.find(m => m.sourceHeader === key);
                if (mapping && mapping.targetHeader) {
                    newRow[mapping.targetHeader] = row[key];
                } else {
                    // Only pass through dynamically generated keys (which are NOT in the original parsed source headers)
                    // Or if a key matches exactly a generated `Notice (Auto)` or dynamic Co-Borrower
                    if (!parsedData?.headers.includes(key)) {
                        newRow[key] = row[key];
                        finalHeaders.add(key);
                    }
                }
            });

            return newRow;
        });

        return {
            data: mappedRows,
            headers: Array.from(finalHeaders)
        };
    }

    return {
        parsedData: processedData, // Return processed data for preview
        mappings,
        isProcessing,
        mlReady,
        mlProgress,
        isPhysical,
        allowDuplicateBarcodes,
        isConsolidated,
        customTargetHeaders,
        deletedTargetHeaders,
        allTargetHeaders,
        handleFileUpload,
        handleMappingChange,
        handleTargetRename,
        handleAddCustomColumn,
        handlePhysicalToggle,
        handleConsolidationToggle,
        handleReset,
        handleDeleteColumn,
        handleRestoreColumn,
        getExportData, // Expose this for the export button
        setNewColumnName: () => { },
    };
}
