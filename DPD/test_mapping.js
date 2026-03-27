
// Mock of the FIXED parseCSV function from src/app/utils/dataUtils.ts
const parseCSV = (text) => {
    // Remove BOM if present
    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return [];

    // Helper to clean values (remove surrounding quotes and whitespace)
    const cleanValue = (val) => val.trim().replace(/^["']|["']$/g, '').trim();

    const headers = lines[0].split(',').map(cleanValue);

    // Helper to find index of a column given possible names
    const findColumnIndex = (possibleNames) => {
        return headers.findIndex(h => {
            const lower = h.toLowerCase();
            return possibleNames.some(name => lower === name.toLowerCase());
        });
    };

    // Mappings based on user request
    const indices = {
        customerName: findColumnIndex(['Full Name', 'Customer Name', 'Name']),
        accountNumber: findColumnIndex(['Account Number', 'LAN', 'Account']),
        dpd: findColumnIndex(['Day pass Due(DPD)', 'DPD', 'Days Past Due']),
        amount: findColumnIndex(['Total Amount', 'Amount', 'Original Amount']),
        contactEmail: findColumnIndex(['Email', 'Email Address']),
        contactPhone: findColumnIndex(['Phone', 'Phone Number', 'Mobile']),
        address: findColumnIndex(['Address', 'Location']),
        allocationDate: findColumnIndex(['Allocation Date', 'Date']),
        lender: findColumnIndex(['Lender', 'Bank', 'NBFC']),
    };

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(cleanValue);

        // Skip empty lines
        if (values.length <= 1 && !values[0]) continue;

        // Helper to get value or default
        const getValue = (index, defaultVal = '') => {
            return index !== -1 && values[index] ? values[index] : defaultVal;
        };

        const dpdVal = getValue(indices.dpd, '0');
        const dpdMatch = dpdVal.match(/\d+/); // Extract number
        const dpd = dpdMatch ? parseInt(dpdMatch[0]) : 0;

        data.push({
            customerName: getValue(indices.customerName, `Customer ${i}`),
            accountNumber: getValue(indices.accountNumber, `ACC${1000 + i}`),
            DPD: dpd,
            email: getValue(indices.contactEmail, ''),
            phone: getValue(indices.contactPhone, ''),
            address: getValue(indices.address, ''),
            lender: getValue(indices.lender, 'Quidcash'),
        });
    }
    return data;
};

console.log("Testing Flexible Header Mapping & Lender...");

const testCSV = `Full Name,Phone Number,LAN,Email,Day pass Due(DPD),Address,Lender
John Doe,1234567890,LAN123,,30,123 Main St,HDB
Jane Smith,,LAN456,jane@example.com,60,,Sarvgram`;

const results = parseCSV(testCSV);

if (results.length !== 2) {
    console.error("FAIL: Expected 2 results, got " + results.length);
} else {
    const r1 = results[0];
    if (r1.customerName === 'John Doe' && r1.lender === 'HDB') {
        console.log("[PASS] Row 1: Correctly mapped Lender HDB");
    } else {
        console.log("[FAIL] Row 1 Incorrect mapping:", r1);
    }

    const r2 = results[1];
    if (r2.customerName === 'Jane Smith' && r2.lender === 'Sarvgram') {
        console.log("[PASS] Row 2: Correctly mapped Lender Sarvgram");
    } else {
        console.log("[FAIL] Row 2 Incorrect mapping:", r2);
    }
}
