const testHTML = `<h1 style="background-color: transparent; font-size: 14px;">what is thid</h1>
<p>Hello, \${borrower_name}</p>`;

async function test() {
    const res = await fetch("http://localhost:54321/api/translate", {
        method: "POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({text: testHTML, dest: "hi"})
    });
    const data = await res.json();
    console.log("Translated preview:", data.translatedText);
}
test();
