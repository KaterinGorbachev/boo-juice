// change number of ingredients

let voices = speechSynthesis.getVoices();


speechSynthesis.onvoiceschanged = () => {
    voices = speechSynthesis.getVoices();
    console.log("Available voices:", voices);
};


document.addEventListener("DOMContentLoaded", () => {
    const recepy_steps_text = document.querySelectorAll(".step")
    var fullText = "";

    for(const step of recepy_steps_text){ 
        const num_step = step.dataset.base;
        const step_text = step.dataset.medida;
        fullText += `Paso ${num_step}. ${step_text}. `;
    }


    const play_btn = document.getElementById("play_recepy")

    let u = null;
    let voices = speechSynthesis.getVoices();
    var api_voice = null
    let lang = document.documentElement.lang || "es"
    let language = "es-ES"

    const changeVoice = () => {
        if(voices.length > 0){ 
            if (lang.includes("es")) {
                language = "es-ES";
                api_voice = voices.find(v => v.lang === "es-ES") 
                  || voices.find(v => v.lang.startsWith("es")) ;
            } else if (lang.includes("en")) {
                language = "en-US";
                api_voice = voices.find(v => v.lang === "en-US") 
                  || voices.find(v => v.lang.startsWith("en")); 
            } else {
                language = "es-ES";
                api_voice = api_voice = voices.find(v => v.lang === "es-ES") 
                  || voices.find(v => v.lang.startsWith("es")) ;
            }
        } else {
            if (lang.includes("es")) {
                language = "es-ES";                
            } else if (lang.includes("en")) {
                language = "en-US";
                
            } else {
                language = "es-ES";
                
            }

        }
        
    }

    changeVoice()

    speechSynthesis.onvoiceschanged = () => {
        voices = speechSynthesis.getVoices();
        console.log("Available voices:", voices);
        changeVoice()              
        console.log(api_voice);
        
    };    



    //play step by step control errors
    let currentStep = 0;
    let utterance = null;
    let delayTimer = null;
    let isPlaying = false;

    const play_step_by_step = () => {

        // If currently speaking → toggle pause/resume
        if (speechSynthesis.speaking) {

            if (speechSynthesis.paused) {
                speechSynthesis.resume();
                play_btn.innerText = "Pause";
            } else {
                speechSynthesis.pause();
                play_btn.innerText = "Resume";
            }

            return;
        }

        // If already playing but not speaking (rare edge case)
        if (isPlaying) return;

        // Reset state
        currentStep = 0;
        isPlaying = true;

        speakStep(currentStep);
    };


    function speakStep(index) {

        // Safety check
        if (!recepy_steps_text || recepy_steps_text.length === 0) {
            console.error("No recipe steps found");
            resetPlayer();
            return;
        }

        // Finished all steps
        if (index >= recepy_steps_text.length) {
            resetPlayer();
            return;
        }

        const step = recepy_steps_text[index];
        if (!step || !step.dataset.medida) {
            console.warn("Invalid step at index:", index);
            currentStep++;
            speakStep(currentStep);
            return;
        }

        const text = `Paso ${index + 1}. ${step.dataset.medida}.`;

        try {
            utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = language;

            // Optional voice
            if (api_voice && speechSynthesis.getVoices().includes(api_voice)) {
                utterance.voice = api_voice;
            }

            utterance.onstart = () => {
                console.log("Speaking step", index + 1);
                play_btn.innerText = "Pause";
            };

            utterance.onend = () => {
                console.log("Finished step", index + 1);
                currentStep++;

                delayTimer = setTimeout(() => {
                    speakStep(currentStep);
                }, 5000);
            };

            utterance.onerror = (event) => {
                console.error("Speech error:", event.error);
                resetPlayer();
            };

            utterance.onpause = (event) => {
                console.log("Paused at", event.elapsedTime);
            };

            speechSynthesis.speak(utterance);

        } catch (error) {
            console.error("Speech failed:", error);
            resetPlayer();
        }
    }


    function resetPlayer() {

        isPlaying = false;
        play_btn.innerText = "Escuchar";

        if (delayTimer) {
            clearTimeout(delayTimer);
            delayTimer = null;
        }

        speechSynthesis.cancel();
    }
    // play step by step 
    
    /* let currentStep = 0;
    let utterance = null;

    const play_step_by_step = () => {
        // If speaking, toggle pause/resume
        if (speechSynthesis.speaking) {
            if (speechSynthesis.paused) {
                speechSynthesis.resume();
                play_btn.innerText = "Pause";
            } else {
                speechSynthesis.pause();
                play_btn.innerText = "Resume";
            }
            return;
        }

        // If not speaking, start from current step
        currentStep = 0;
        speakStep(currentStep);
    };

function speakStep(index) {
    if (index >= recepy_steps_text.length) {
            play_btn.innerText = "Escuchar";
            return; // Done
        }

    const step = recepy_steps_text[index];
    const text = `Paso ${index + 1}. ${step.dataset.medida}.`;

        utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        //if (api_voice) utterance.voice = api_voice;

        utterance.onend = () => {
            currentStep++;
            // Optional pause between steps
        setTimeout(() => speakStep(currentStep), 5000); // 5 seconds pause
        };

        utterance.onpause = (event) => {
            console.log("Paused at", event.elapsedTime);
        };

        speechSynthesis.speak(utterance);
        play_btn.innerText = "Pause";
    } */

    
    // play all text function
    const play_all_at_once = () => {
        // If currently speaking
        if (speechSynthesis.speaking) {

            if (speechSynthesis.paused) {
                speechSynthesis.resume();
                play_btn.innerText = "Pause";
            } else {
                speechSynthesis.pause();
                play_btn.innerText = "Resume";
            }

            return;
        }

        // First play
        speechSynthesis.cancel();

        u = new SpeechSynthesisUtterance(fullText);
        u.lang = "es-ES";      
        
        if(api_voice){ 
            u.voice = api_voice
        }

        console.log(api_voice);
        

        u.onend = function(event) {
            console.log("Finished in " + event.elapsedTime + " seconds.");
            play_btn.innerText = "Escuchar";
            speechSynthesis.cancel()
        };

        u.onpause = function(event) {
            console.log("Paused at " + event.elapsedTime + " seconds.");
        };

        speechSynthesis.speak(u);
        play_btn.innerText = "Pause";

    }

    
    play_btn.addEventListener("click", () => {

        play_step_by_step()
    }); 
 

    /// The default system voice (or the first available voice) fully supports speechSynthesis.pause() and speechSynthesis.resume().
    // “Google español” (the cloud-based Google voice in Chrome) does not support resume after pause — this is a known limitation of Chrome’s speech engine for certain cloud voices.
    // If you rely on "Google Español" or any Google voice, it will work in Chrome/Edge, but not in Safari.
    

   // https://webaudio.github.io/web-speech-api
    

    // puter.ai
    /* play_btn.addEventListener("click", () => {

        puter.ai.txt2speech(fullText, {
                voice: "Sergio",
                engine: "neural",
                language: "es-ES"
            }).then((audio)=>{
            audio.play();
        });
    }) */

    // responsiveVoice
    /* play_btn.addEventListener("click", () => {

    
        if (responsiveVoice.isPlaying()) {
            responsiveVoice.cancel();
            play_btn.innerText = "Resume";
            return;
        }

        if (play_btn.innerText === "Escuchar") {
            
            responsiveVoice.cancel();

            setTimeout(() => {
                responsiveVoice.speak(fullText, "Spanish Female");
            }, 500);

            play_btn.innerText = "Pause";
            return;
        }

        // Resume after pause
        setTimeout(() => {
            responsiveVoice.resume();            
            }, 1500);
        play_btn.innerText = "Pause";
    }); 

 */










})
const buttons_ingredients_size = document.querySelectorAll(".btns__box button");
const ingredients = document.querySelectorAll(".ingredientes__list li");



buttons_ingredients_size.forEach(button => {
    

    button.addEventListener("click", () => {  
        
        buttons_ingredients_size.forEach(btn=>btn.classList.remove("active"))
            
        // Add active to clicked one
        button.classList.add("active");
        const factor = parseFloat(button.dataset.factor);

        ingredients.forEach(item => {
            const base = parseFloat(item.dataset.base);
            const medida = item.dataset.medida;
            const nombre = item.dataset.nombre;

            const newValue = base * factor;

            if(newValue != 0 ){
                item.textContent = 
                    Number(newValue.toFixed(2)).toString().replace(/\.0$/, '') +
                    " " + medida + " - " + nombre;
            }

            
        });
    });

    
});

// keep scrin active only for Chrome
const toggle_screen_active = document.getElementById("theme-toggle")
let wakeLock = null;
async function requestWakeLock() {
    try {
        wakeLock = await navigator.wakeLock.request("screen");
        console.log("Wake Lock is active 🔥");

        // If system releases it (battery low, tab hidden, etc.)
        wakeLock.addEventListener("release", () => {
            console.log("Wake Lock was released");
        });

    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
}
async function releaseWakeLock() {
    if (wakeLock !== null) {
        await wakeLock.release();
        wakeLock = null;
        console.log("Wake Lock released ❄️");
    }
}
toggle_screen_active.addEventListener("change", async () => {
    if (toggle_screen_active.checked) {
        await requestWakeLock();
    } else {
        await releaseWakeLock();
    }
});

// play recepy 



//=====================================================================
// in case for browser lang choice
/* var lang = window.navigator.languages ? window.navigator.languages[0] : null;
    lang = lang || window.navigator.language || window.navigator.browserLanguage || window.navigator.userLanguage;
if (lang.indexOf('-') !== -1)
    lang = lang.split('-')[0];
if (lang.indexOf('_') !== -1)
    lang = lang.split('_')[0];
console.log(lang);
var say = 'Hello'; */
//=========================================================
// for page lang choice




/* play_btn.addEventListener("click", ()=>{
    let fullText = "";

    recepy_steps_text.forEach(step => {
        const num_step = step.dataset.base;
        const step_text = step.dataset.medida;

        fullText += `Paso ${num_step}. ${step_text}. `;
    });

    responsiveVoice.speak(fullText, "Spanish Female");
}) */



    how to handle this errors 4.2.7. SpeechSynthesisErrorEvent Attributes

The SpeechSynthesisErrorEvent is the interface used for the SpeechSynthesisUtterance error event.

error attribute, of type SpeechSynthesisErrorCode, readonly
    The errorCode is an enumeration indicating what has gone wrong. The values are:

    "canceled"
        A cancel method call caused the SpeechSynthesisUtterance to be removed from the queue before it had begun being spoken. 
    "interrupted"
        A cancel method call caused the SpeechSynthesisUtterance to be interrupted after it has begun being spoken and before it completed. 
    "audio-busy"
        The operation cannot be completed at this time because the user-agent cannot access the audio output device. (For example, the user may need to correct this by closing another application.) 
    "audio-hardware"
        The operation cannot be completed at this time because the user-agent cannot identify an audio output device. (For example, the user may need to connect a speaker or configure system settings.) 
    "network"
        The operation cannot be completed at this time because some required network communication failed. 
    "synthesis-unavailable"
        The operation cannot be completed at this time because no synthesis engine is available. (For example, the user may need to install or configure a synthesis engine.) 
    "synthesis-failed"
        The operation failed because synthesis engine had an error. 
    "language-unavailable"
        No appropriate voice is available for the language designated in SpeechSynthesisUtterance lang. 
    "voice-unavailable"
        The voice designated in SpeechSynthesisUtterance voice attribute is not available. 
    "text-too-long"
        The contents of the SpeechSynthesisUtterance text attribute is too long to synthesize. 
    "invalid-argument"
        The contents of the SpeechSynthesisUtterance rate, pitch or volume attribute is not supported by synthesizer. 
    "not-allowed"
        Synthesis was not allowed to start by the user agent or system in the current context. 


Excellent 👌 this is exactly the right level of question for building a robust recipe app.

You should handle each error differently, because not all errors mean “stop everything”.

Below is a clean production-ready error handler for SpeechSynthesisErrorEvent.

✅ Proper Error Handling Pattern

Add this inside your utterance setup:

utterance.onerror = (event) => {
    handleSpeechError(event);
};


Now define a central error handler:

function handleSpeechError(event) {

    console.error("Speech error:", event.error);

    switch (event.error) {

        case "canceled":
            // Normal behavior when you call speechSynthesis.cancel()
            console.log("Speech canceled intentionally.");
            break;

        case "interrupted":
            console.log("Speech interrupted.");
            break;

        case "audio-busy":
            alert("Audio device is busy. Please close other audio applications.");
            resetPlayer();
            break;

        case "audio-hardware":
            alert("No audio output device detected. Please check speakers.");
            resetPlayer();
            break;

        case "network":
            alert("Network error during speech synthesis.");
            retryCurrentStep();
            break;

        case "synthesis-unavailable":
            alert("Speech engine unavailable.");
            resetPlayer();
            break;

        case "synthesis-failed":
            alert("Speech synthesis failed.");
            retryCurrentStep();
            break;

        case "language-unavailable":
            console.warn("Requested language not available. Falling back.");
            fallbackToDefaultVoice();
            retryCurrentStep();
            break;

        case "voice-unavailable":
            console.warn("Selected voice unavailable. Falling back.");
            fallbackToDefaultVoice();
            retryCurrentStep();
            break;

        case "text-too-long":
            console.warn("Text too long. Splitting...");
            splitAndSpeak();
            break;

        case "invalid-argument":
            console.warn("Invalid rate/pitch/volume. Resetting.");
            resetSpeechSettings();
            retryCurrentStep();
            break;

        case "not-allowed":
            alert("Speech blocked. Please interact with the page first.");
            resetPlayer();
            break;

        default:
            console.warn("Unknown speech error:", event.error);
            resetPlayer();
    }
}

🧠 Now Let's Implement the Helpers
🔁 Retry Current Step
function retryCurrentStep() {
    speechSynthesis.cancel();
    setTimeout(() => {
        speakStep(currentStep);
    }, 500);
}

🔄 Fallback Voice
function fallbackToDefaultVoice() {
    const voices = speechSynthesis.getVoices();
    api_voice = voices.find(v => v.lang.startsWith("es")) || voices[0];
}

✂️ Split Long Text

Browsers sometimes fail with long text.

function splitAndSpeak() {
    const step = recepy_steps_text[currentStep];
    const sentences = step.dataset.medida.split(". ");

    function speakSentence(i) {
        if (i >= sentences.length) {
            currentStep++;
            speakStep(currentStep);
            return;
        }

        const u = new SpeechSynthesisUtterance(sentences[i]);
        u.lang = language;

        u.onend = () => speakSentence(i + 1);

        speechSynthesis.speak(u);
    }

    speakSentence(0);
}

🔧 Reset Invalid Settings
function resetSpeechSettings() {
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
}

🛑 Reset Player
function resetPlayer() {
    speechSynthesis.cancel();
    currentStep = 0;
    play_btn.innerText = "Escuchar";
}

🎯 Which Errors Actually Matter in Real Life?

In recipe apps, the most common ones are:

Error	Common?	What to do
"not-allowed"	🔥 Very common (Safari autoplay)	Require user click
"voice-unavailable"	Common	Fallback voice
"language-unavailable"	Common	Fallback voice
"text-too-long"	Sometimes	Split text
"canceled"	Normal	Ignore
"interrupted"	Normal	Ignore

Rare:

audio-hardware

synthesis-failed

synthesis-unavailable

🏆 Production-Level Tip

Never show alert() in production.

Instead:

showToast("Audio device busy");


Or show small UI message near the play button.

🧠 Final Advice For Your Recipe App

For cooking UX:

Ignore "canceled" and "interrupted"

Handle "not-allowed" properly (Safari requires click)

Always fallback on "voice-unavailable"

Split text if "text-too-long"

That’s 95% of real-world cases.

If you want, I can now show you:

✅ How to make your player fully Safari-safe

✅ How to queue steps without recursion

✅ Or how to build a professional speech controller class

Tell me which level you want next 🚀



