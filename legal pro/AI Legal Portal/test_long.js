const paragraph = `<p>This is a repeating paragraph to make the text very long. We need to exceed five thousand characters to see how the translation API behaves. The user reported that long formal letters get truncated during translation. This could be due to a hard limit in the python googletrans library or the Google Translate API itself.</p>\n`;
const longText = `<h1 style="text-align: center;">LEGAL RECOVERY NOTICE</h1>\n` + paragraph.repeat(100) + `<p>End of notice.</p>`;

async function test() {
    console.log("Original length:", longText.length);
    const res = await fetch("http://localhost:54321/api/translate", {
        method: "POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({text: longText, dest: "hi"})
    });
    const data = await res.json();
    console.log("Translated length:", data.translatedText.length);
    console.log("Preview start:", data.translatedText.substring(0, 200));
    console.log("Preview end:", data.translatedText.substring(data.translatedText.length - 200));
}
test();
