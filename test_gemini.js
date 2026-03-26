async function test() {
    try {
        const res = await fetch("http://localhost:54321/api/translate-with-accuracy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: "Hello world, this is a legal notice.", target_lang: "hi" })
        });
        console.log("Status:", res.status);
        console.log("Response:", await res.text());
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}
test();
