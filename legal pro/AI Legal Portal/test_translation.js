const targetLangs = ['hi', 'mr', 'gu', 'ta', 'te', 'bn', 'kn', 'ml'];
const textToTranslate = "This is a legal notice to inform you about the pending payment.";

async function testTranslation() {
    console.log("Testing translation for multiple languages...");
    for (const lang of targetLangs) {
        try {
            const response = await fetch('http://localhost:54321/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToTranslate, target_lang: lang })
            });

            if (!response.ok) {
                console.error(`Error for ${lang}: HTTP ${response.status}`);
                const err = await response.text();
                continue;
            }

            const data = await response.json();
            console.log(`[${lang}]: ${data.translatedText || data.translated_text || data.text || JSON.stringify(data)}`);
        } catch (error) {
            console.error(`Failed to reach server for ${lang}:`, error.message);
        }
    }
}

testTranslation();
