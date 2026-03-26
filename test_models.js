async function test() {
    try {
        const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyDHp3dZOJG-8Db96liooBFA5Fd8ljOnJf4");
        const data = await res.json();
        const flashModels = data.models.filter(m => m.name.includes("flash")).map(m => m.name);
        console.log(flashModels);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}
test();
