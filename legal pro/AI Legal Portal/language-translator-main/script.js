let languages = {}; // Will be populated from backend


const fromLang = document.getElementById('from-lang');
const toLang = document.getElementById('to-lang');
const fromText = document.getElementById('from-text');
const toText = document.getElementById('to-text');
const translateBtn = document.getElementById('translate-btn');
const clearBtn = document.getElementById('clear-btn');
const copyBtn = document.getElementById('copy-btn');
const voiceBtn = document.getElementById('voice-input');
const readAloudBtn = document.getElementById('read-aloud');
const charCount = document.querySelector('.char-count');

// Populate language dropdowns from backend
async function populateLanguages() {
    try {
        const response = await fetch('http://127.0.0.1:8000/languages');
        if (!response.ok) throw new Error("Failed to load languages");
        
        languages = await response.json();
        
        fromLang.innerHTML = '<option value="auto">Auto Detect</option>';
        toLang.innerHTML = '';

        for (let code in languages) {
            let opt1 = new Option(languages[code], code);
            let opt2 = new Option(languages[code], code);
            fromLang.add(opt1);
            toLang.add(opt2);
        }
        
        // Restore defaults
        fromLang.value = "auto";
        toLang.value = "hi";

    } catch (error) {
        console.error("Language load error:", error);
        // Fallback or alert
        alert("Could not load languages from server. Ensure the backend is running.");
    }
}

populateLanguages();

// Debounce function to limit API calls
function debounce(func, timeout = 500) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

const debouncedTranslate = debounce(() => translateText());

// Character count and auto-translate
fromText.addEventListener('input', () => {
    const count = fromText.value.length;
    charCount.textContent = `${count} / 5000`;
    
    if (fromText.value.trim()) {
        debouncedTranslate();
    } else {
        toText.value = '';
    }
});

// Auto-translate on language change
[fromLang, toLang].forEach(el => {
    el.addEventListener('change', () => {
        if (fromText.value.trim()) {
            translateText();
        }
    });
});

// Translation Logic with Placeholder Protection
async function translateText() {
    const text = fromText.value;
    const dest = toLang.value;
    const src = fromLang.value === 'auto' ? '' : fromLang.value;

    if (!text.trim()) return;
    
    if (text.length > 5000) {
        alert("Text exceeds 5000 character limit.");
        return;
    }

    translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
    translateBtn.classList.add('loading');
    translateBtn.disabled = true;

    try {
        // Placeholder Protection
        const placeholderRegex = /\{.*?\}/g;
        const placeholders = text.match(placeholderRegex) || [];
        
        // Prepare request payload for local FastAPI server
        const payload = {
            text: text,
            dest: dest
        };

        const response = await fetch('http://127.0.0.1:8000/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();
        toText.value = data.translatedText;
    } catch (error) {
        console.error("Translation error:", error);
        alert("Translation failed. Make sure your Python server is running (python main.py)");
    } finally {
        translateBtn.innerHTML = '<i class="fas fa-magic"></i> Translate Now';
        translateBtn.classList.remove('loading');
        translateBtn.disabled = false;
    }
}

translateBtn.addEventListener('click', translateText);

// Utility: Clear
clearBtn.addEventListener('click', () => {
    fromText.value = '';
    toText.value = '';
    charCount.textContent = '0 / 5000';
});

// Utility: Copy
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(toText.value).then(() => {
        const originalIcon = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => copyBtn.innerHTML = originalIcon, 2000);
    });
});

// Feature: Read Aloud
readAloudBtn.addEventListener('click', () => {
    if (!toText.value) return;
    const utterance = new SpeechSynthesisUtterance(toText.value);
    utterance.lang = toLang.value;
    window.speechSynthesis.speak(utterance);
});

// Feature: Voice Input
voiceBtn.addEventListener('click', () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Voice recognition is not supported in this browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = fromLang.value === 'auto' ? 'en-US' : fromLang.value;

    voiceBtn.innerHTML = '<i class="fas fa-microphone-alt fa-beat"></i>';
    recognition.start();

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        fromText.value += transcript;
        fromText.dispatchEvent(new Event('input'));
    };

    recognition.onend = () => {
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    };
});

// Swap Languages and Text
document.getElementById('swap-languages').addEventListener('click', () => {
    // Swap choices
    const tempLang = fromLang.value;
    const tempText = fromText.value;

    if (tempLang === 'auto') {
        // Find the detected language if possible, or just don't swap if auto
        return; 
    }

    fromLang.value = toLang.value;
    toLang.value = tempLang;

    // Swap text content
    fromText.value = toText.value;
    toText.value = tempText;

    // Update char count
    fromText.dispatchEvent(new Event('input'));
});
