import { AllocationData } from '../types';

// Parse a line in a CSV, respecting quoted fields that may contain commas
export const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        const next = line[i + 1];

        if (ch === '"') {
            if (inQuotes && next === '"') {
                // Escaped quote
                current += '"';
                i++; // skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }

    result.push(current);
    return result.map((val) => val.trim());
};

export const parseCSV = (text: string): AllocationData[] => {
    // Remove BOM if present
    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return [];

    // Helper to clean values (remove surrounding quotes and whitespace)
    const cleanValue = (val: string) => val.trim().replace(/^['\"]|['\"]$/g, '').trim();

    const headers = parseCSVLine(lines[0]).map(cleanValue);

    // Helper to find index of a column given possible names
    const findColumnIndex = (possibleNames: string[]) => {
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
        amount: findColumnIndex(['Total Amount', 'Amount', 'Original Amount', 'Outstanding Amount', 'Outstanding Amt', 'Total OS', 'Principal', 'Balance', 'Bal']),
        contactEmail: findColumnIndex(['Email', 'Email Address']),
        contactPhone: findColumnIndex(['Phone', 'Phone Number', 'Phone Num', 'Phone_Num', 'Mobile', 'Mobile Number', 'Contact Number', 'Phonenum', 'Phonenumber']),
        address: findColumnIndex(['Address', 'Location']),
        allocationDate: findColumnIndex(['Allocation Date', 'Date', 'OS Date', 'Disbursement Date']),
        lender: findColumnIndex(['Lender', 'Bank', 'NBFC']),
    };

    const data: AllocationData[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]).map(cleanValue);

        // Skip empty lines
        if (values.length <= 1 && !values[0]) continue;

        // Helper to get value or default
        const getValue = (index: number, defaultVal: string = '') => {
            return index !== -1 && values[index] ? values[index] : defaultVal;
        };

        // Robust parsing of amount - remove all non-numeric characters except the decimal point
        const amountStr = getValue(indices.amount).replace(/[^0-9.]/g, '');
        const originalAmount = parseFloat(amountStr) || 0;

        // DPD parsing
        const dpdVal = getValue(indices.dpd, '0');
        // Extract number from string if needed (e.g. "10 Days")
        const dpdMatch = dpdVal.match(/\d+/);
        const dpd = dpdMatch ? parseInt(dpdMatch[0]) : 0;

        // Allocation Date parsing - if missing, calculate backwards from DPD
        let allocationDate = getValue(indices.allocationDate);
        if (!allocationDate) {
            const date = new Date();
            date.setDate(date.getDate() - dpd);
            allocationDate = date.toISOString().split('T')[0];
        }

        const accountNumber = getValue(indices.accountNumber, `ACC${1000 + i}`);
        const customerName = getValue(indices.customerName, `Customer ${i}`);

        data.push({
            id: `ALLOC-${accountNumber}-${Date.now()}-${i}`,
            customerName: customerName,
            accountNumber: accountNumber,
            DPD: dpd,
            originalAmount: originalAmount,
            amount: originalAmount, // Will be calculated dynamically
            contactEmail: getValue(indices.contactEmail, ''), // Blank if missing
            contactPhone: getValue(indices.contactPhone, ''), // Blank if missing
            address: getValue(indices.address, ''),           // Blank if missing
            allocationDate: allocationDate,
            uploadedAt: new Date().toISOString(),
            lender: getValue(indices.lender, 'Quidcash'), // Default to Quidcash if missing
            isPaid: false,
        });
    }
    return data;
};

export const getSampleData = (): AllocationData[] => {
    const today = new Date();
    const getDateDaysAgo = (days: number) => {
        const date = new Date(today);
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
    };

    const lenders = ['Quidcash', 'Sarvgram', 'HDB'];

    return [
        {
            id: 'ALLOC-001',
            customerName: 'Rajesh Kumar',
            accountNumber: 'ACC1001',
            DPD: 12,
            originalAmount: 45000,
            amount: 45000,
            contactEmail: 'rajesh.kumar@example.com',
            contactPhone: '+91-9876543210',
            address: '123, MG Road, Bangalore, Karnataka, 560001',
            allocationDate: getDateDaysAgo(12),
            uploadedAt: getDateDaysAgo(0),
            lender: 'Quidcash',
            isPaid: false,
        },
        {
            id: 'ALLOC-002',
            customerName: 'Priya Sharma',
            accountNumber: 'ACC1002',
            DPD: 28,
            originalAmount: 32000,
            amount: 32000,
            contactEmail: 'priya.sharma@example.com',
            contactPhone: '+91-9876543211',
            address: '456, Park Street, Mumbai, Maharashtra, 400001',
            allocationDate: getDateDaysAgo(28),
            lender: 'Sarvgram',
            isPaid: false,
        },
        {
            id: 'ALLOC-003',
            customerName: 'Amit Patel',
            accountNumber: 'ACC1003',
            DPD: 45,
            originalAmount: 67000,
            amount: 67000,
            contactEmail: 'amit.patel@example.com',
            contactPhone: '+91-9876543212',
            address: '789, Civil Lines, Delhi, 110001',
            allocationDate: getDateDaysAgo(45),
            lender: 'HDB',
            isPaid: false,
        },
        {
            id: 'ALLOC-004',
            customerName: 'Sneha Reddy',
            accountNumber: 'ACC1004',
            DPD: 55,
            originalAmount: 89000,
            amount: 89000,
            contactEmail: 'sneha.reddy@example.com',
            contactPhone: '+91-9876543213',
            address: '321, Jubilee Hills, Hyderabad, Telangana, 500033',
            allocationDate: getDateDaysAgo(55),
            lender: 'Quidcash',
            isPaid: false,
        },
        {
            id: 'ALLOC-005',
            customerName: 'Vikram Singh',
            accountNumber: 'ACC1005',
            DPD: 72,
            originalAmount: 125000,
            amount: 125000,
            contactEmail: 'vikram.singh@example.com',
            contactPhone: '+91-9876543214',
            address: '654, Model Town, Jaipur, Rajasthan, 302001',
            allocationDate: getDateDaysAgo(72),
            lender: 'Sarvgram',
            isPaid: false,
        },
        {
            id: 'ALLOC-006',
            customerName: 'Anita Desai',
            accountNumber: 'ACC1006',
            DPD: 85,
            originalAmount: 98000,
            amount: 98000,
            contactEmail: 'anita.desai@example.com',
            contactPhone: '+91-9876543215',
            address: '987, Salt Lake, Kolkata, West Bengal, 700091',
            allocationDate: getDateDaysAgo(85),
            lender: 'HDB',
            isPaid: false,
        },
        {
            id: 'ALLOC-007',
            customerName: 'Rahul Mehta',
            accountNumber: 'ACC1007',
            DPD: 5,
            originalAmount: 23000,
            amount: 23000,
            contactEmail: 'rahul.mehta@example.com',
            contactPhone: '+91-9876543216',
            address: '147, Koramangala, Bangalore, Karnataka, 560034',
            allocationDate: getDateDaysAgo(5),
            lender: 'Quidcash',
            isPaid: false,
        },
        {
            id: 'ALLOC-008',
            customerName: 'Deepika Iyer',
            accountNumber: 'ACC1008',
            DPD: 16,
            originalAmount: 54000,
            amount: 54000,
            contactEmail: 'deepika.iyer@example.com',
            contactPhone: '+91-9876543217',
            address: '258, Anna Nagar, Chennai, Tamil Nadu, 600040',
            allocationDate: getDateDaysAgo(16),
            lender: 'Sarvgram',
            isPaid: false,
        },
    ];
};
