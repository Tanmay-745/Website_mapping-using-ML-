const paragraph = `<p>This is a repeating paragraph to make the text very long. We need to exceed five thousand characters to see how the translation API behaves. The user reported that long formal letters get truncated during translation. This could be due to a hard limit in the python googletrans library or the Google Translate API itself.</p>\n`;
const longText = `<h1 style="text-align: center;">LEGAL RECOVERY NOTICE</h1>\n` + paragraph.repeat(30) + `<p>End of notice.</p>`;

async function test() {
    const res = await fetch("http://localhost:54321/api/translate", {
        method: "POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({text: longText, dest: "hi"})
    });
    const data = await res.json();
    const translated = data.translatedText;
    
    const countOriginal = (longText.match(/<\/p>/g) || []).length;
    const countTranslated = (translated.match(/<\/p>/g) || []).length;
    
    console.log("Original </p> count:", countOriginal);
    console.log("Translated </p> count:", countTranslated);
}
test();
