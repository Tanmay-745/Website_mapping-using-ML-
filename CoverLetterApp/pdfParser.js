const axios = require('axios');
const PDFParser = require("pdf2json");

async function parseEnvelopeDataFromPdf(pdfUrl) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });

            const pdfParser = new PDFParser(this, 1);

            pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
            pdfParser.on("pdfParser_dataReady", () => {
                const rawText = pdfParser.getRawTextContent();

                // Match everything between "To," and the 10-digit mobile number + "SUBJECT:"
                const regex = /To,\r?\n([\s\S]+?)\r?\n(\d{10})\r?\n(?:SUBJECT:|विषय:)/i;
                const match = rawText.match(regex);

                if (match) {
                    const block = match[1].trim().split(/\r?\n/);
                    let address = block.pop().trim();
                    // If address line is somehow empty or very short, pull another line
                    if (address.length < 5 && block.length > 0) {
                        address = block.pop().trim() + " " + address;
                    }

                    // Clean up messy consecutive punctuation
                    // First remove any spaces around punctuation to group them
                    address = address.replace(/\s*([,.;:'"\[\]()])\s*/g, '$1');
                    // Matches 2 or more consecutive occurrences of punctuation and replaces them with a single comma
                    address = address.replace(/[,.;:'"\[\]()]{2,}/g, ',');
                    // Add back proper spacing around commas
                    address = address.replace(/,/g, ', ').trim();
                    // Remove any trailing commas at the very end of the string
                    address = address.replace(/,\s*$/, '');

                    const name = block.map(n => n.trim()).filter(n => n).join(', ');
                    const phone = match[2];

                    resolve({ name, address, phone });
                } else {
                    reject(new Error("Could not find matching text structure in PDF"));
                }
            });

            pdfParser.parseBuffer(response.data);

        } catch (err) {
            reject(err);
        }
    });
}

// Test snippet
if (require.main === module) {
    const testUrl1 = 'https://credresolve.s3.amazonaws.com/final/2308/sarvgram2308/2025-08-23/pdfs/BLUNS00006693.pdf';
    const testUrl2 = 'https://credresolve.s3.amazonaws.com/final/2308/sarvgram2308/2025-08-23/pdfs/BLUNS00005350.pdf';

    parseEnvelopeDataFromPdf(testUrl1)
        .then(data => console.log('Test 1:', data))
        .catch(console.error);

    parseEnvelopeDataFromPdf(testUrl2)
        .then(data => console.log('Test 2:', data))
        .catch(console.error);
}

module.exports = { parseEnvelopeDataFromPdf };
