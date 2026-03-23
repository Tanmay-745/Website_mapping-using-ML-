/**
 * Converts a number into Indian Rupees in words.
 * Supports Lakhs and Crores.
 */
export function numberToWords(num: number): string {
    if (isNaN(num)) return "Zero Rupees Only";
    
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convert(n: number): string {
        if (n < 10) return units[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
        if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convert(n % 100) : '');
        return '';
    }

    if (num === 0) return 'Zero Rupees Only';

    const parts = num.toFixed(2).split('.');
    let rupees = parseInt(parts[0]);
    let paise = parseInt(parts[1]);

    let res = '';
    
    if (rupees >= 10000000) {
        res += convert(Math.floor(rupees / 10000000)) + ' Crore ';
        rupees %= 10000000;
    }
    if (rupees >= 100000) {
        res += convert(Math.floor(rupees / 100000)) + ' Lakh ';
        rupees %= 100000;
    }
    if (rupees >= 1000) {
        res += convert(Math.floor(rupees / 1000)) + ' Thousand ';
        rupees %= 1000;
    }
    if (rupees > 0) {
        res += convert(rupees);
    }

    res = res.trim() + ' Rupees';

    if (paise > 0) {
        res += ' and ' + convert(paise) + ' Paise';
    }

    return res + ' Only';
}

/**
 * Formats a number as Indian Currency string.
 */
export function formatCurrency(num: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(num);
}
