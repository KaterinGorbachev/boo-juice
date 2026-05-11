document.addEventListener("DOMContentLoaded", () => { 
    //=============================================================
    // functionality to play recepy with https://webaudio.github.io/web-speech-api
    //=============================================================

    //===============
    // function to play step by step
    //===============    

    // 2. get play buttons 
    const play_btn = document.getElementById("play_recepy")
    const play_btn_mobile = document.getElementById("play_recepy_mobile")
    const stop_btn_mobile = document.getElementById("stop_recepy_mobile")
    const pause_btn = document.getElementById("pause_recepy")
    //const play_back = document.getElementById("back_play")
    //const play_next = document.getElementById("next_play")
    const resume_btn = document.getElementById("resume_recepy")
    const step_buttons = document.querySelectorAll(".player-by-step")
    const errorBanner = document.getElementById("speech-error")
    const player_mobile = document.querySelector(".player-mobile")
    

    function showError(message) {
        if (!errorBanner) return;
        errorBanner.textContent = message;
        errorBanner.classList.remove("hidden");
    }

    function clearError() {
        if (!errorBanner) return;
        errorBanner.textContent = "";
        errorBanner.classList.add("hidden");
    }

    // 3. get voice for html lang tag
    var api_voice = null

    // all voices provided by browser and OS
    let voices = speechSynthesis.getVoices();
    
    // get a lang from html --> for future functionality if page has different languages
    // default language is Spanish
    let lang = document.documentElement.lang || "es"
    let language = "es-ES"

    let recepy_steps_text = document.querySelectorAll(".step")

    // change voice dependingly on page language 
    // if API has not loaded special voices - use default machine voice and change only language
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

    //get special voice 
    changeVoice() 
    // log voice in usage 
    console.log('Voice to speak', api_voice)

    // wait for api to download voices if any change happens
    speechSynthesis.onvoiceschanged = () => {
        voices = speechSynthesis.getVoices();
        changeVoice()   
        console.log('Voice to speak onvoiceschanged', api_voice)           
                
    };    

    const SpeechController = (() => {

    // =========================
    // 🔐 STATE
    // =========================
    let state = "idle";
    let currentIndex = 0;
    let chunks = [];
    let chunkIndex = 0;
    let isPausedManually = false;
    let stepsRef = null;
    let flowId = 0;

    // =========================
    // UI UPDATE
    // =========================
    function updateUI(state) {

        if (state === "playing") {
            play_btn_mobile?.classList.add("hidden");
            stop_btn_mobile?.classList.remove("hidden");
            pause_btn?.classList.remove("hidden");
            resume_btn?.classList.add("hidden");
            play_btn?.classList.add("hidden");
        }
        if (state === "paused") {
            play_btn_mobile?.classList.remove("hidden");
            stop_btn_mobile?.classList.add("hidden");
            pause_btn?.classList.add("hidden");
            resume_btn?.classList.remove("hidden");
        }
        if (state === "idle") {
            play_btn_mobile?.classList.remove("hidden");
            stop_btn_mobile?.classList.add("hidden");
            pause_btn?.classList.add("hidden");
            resume_btn?.classList.add("hidden");
            play_btn?.classList.remove("hidden");
        }

        
    }

    // =========================
    // ▶️ PLAY STEP
    // =========================
    function play(index, steps) {

        flowId++; // new session (race protection)

        stepsRef = steps;
        currentIndex = index;
        chunkIndex = 0;
        isPausedManually = false;
        state = "playing";

        clearError();
        window.speechSynthesis.cancel();

        const step = steps[currentIndex];
        if (!step) return;

        const text = 'Paso ' + (currentIndex + 1) + ': ' + step.dataset.medida;

        chunks = splitText(text);

        speakChunk(); // IMPORTANT: no flow passed
    }

    // =========================
    // ⏸️ PAUSE
    // =========================
    function pause() {

        if (state !== "playing") return;

        if (!speechSynthesis.speaking) return;

        isPausedManually = true;
        state = "paused";

        window.speechSynthesis.pause();
        updateUI("paused");
    }

    // =========================
    // ▶️ RESUME
    // =========================
    function resume() {

        if (state !== "paused") return;

        isPausedManually = false;

        if (speechSynthesis.paused) {
            state = "playing";
            speechSynthesis.resume();
            updateUI("playing");
            return;
        }

        if (!speechSynthesis.speaking) {
            state = "playing";
            speakChunk();
            return;
        }
    }

    // =========================
    // ⏭️ NEXT
    // =========================
    function next() {

        if (!stepsRef) return;

        if (currentIndex >= stepsRef.length - 1) {
            speechSynthesis.cancel();
            state = "idle";
            currentIndex = 0;
            updateUI("idle");
            return;
        }

        play(currentIndex + 1, stepsRef);
    }

  

    // =========================
    // 🔊 SPEAK CHUNK ENGINE
    // =========================
    function speakChunk() {

        if (state !== "playing") return;

        if (chunkIndex >= chunks.length) {
            return handleStepEnd();
        }

        const text = chunks[chunkIndex];

        if (!text) {
            return handleStepEnd();
        }

        const u = new SpeechSynthesisUtterance(text);

        u.lang = language;
        if (api_voice) u.voice = api_voice;
        u.rate = 0.9;

        // snapshot ONLY for race protection
        const myFlow = flowId;

        u.onstart = () => {
            updateUI("playing");
        };

        u.onend = () => {

            // ignore stale speech
            if (myFlow !== flowId) return;

            onChunkEnd();
        };

        u.onerror = (e) => {

            if (myFlow !== flowId) return;

            handleSpeechError(e);
        };

        u.onpause = () => {
            if (state === "paused") updateUI("paused");
        };

        u.onresume = () => {
            if (state === "playing") updateUI("playing");
        };

        speechSynthesis.speak(u);
    }

    // =========================
    // 🧠 CHUNK FLOW
    // =========================
    function onChunkEnd() {

        if (!stepsRef) return;

        if (isPausedManually && speechSynthesis.paused) return;

        if (isPausedManually && !speechSynthesis.paused) {
            isPausedManually = false;
        }

        chunkIndex++;
        speakChunk();
    }

    // =========================
    // 🧠 STEP FLOW
    // =========================
    function handleStepEnd() {

        if (!stepsRef) return;

        if (isPausedManually && speechSynthesis.paused) return;

        if (currentIndex >= stepsRef.length - 1) {
            state = "idle";
            currentIndex = 0;
            updateUI("idle");
            return;
        }

        play(currentIndex + 1, stepsRef);
    }

    // =========================
    // ✂️ SPLIT TEXT
    // =========================
    function splitText(text) {

        const MAX = 160;
        const words = text.replace(/\s+/g, " ").trim().split(" ");

        let result = [];
        let buffer = "";

        for (let word of words) {

            const test = buffer ? buffer + " " + word : word;

            if (test.length <= MAX) {
                buffer = test;
            } else {
                if (buffer) result.push(buffer);
                buffer = word;
            }
        }

        if (buffer) result.push(buffer);

        return result;
    }

    // =========================
    // ❌ ERROR HANDLER
    // =========================
    function handleSpeechError(event) {

        if (event.error === "canceled" || event.error === "interrupted") return;

        console.error("Speech error:", event.error);

        switch (event.error) {

            case "audio-busy":
            case "audio-hardware":
                showError("Audio device is busy or unavailable. Please check your audio settings.");
                resetPlayer();
                break;

            case "synthesis-unavailable":
                showError("Speech synthesis is not available in your browser.");
                resetPlayer();
                break;

            case "not-allowed":
                showError("Speech is not allowed. Please check your browser permissions.");
                resetPlayer();
                break;

            case "network":
                showError("Network error while loading speech. Retrying...");
                retryCurrentStep();
                break;

            case "synthesis-failed":
                showError("Speech failed to load. Retrying...");
                retryCurrentStep();
                break;

            case "language-unavailable":
            case "voice-unavailable":
                showError("Selected voice is not available. Switching to default...");
                fallbackToDefaultVoice();
                retryCurrentStep();
                break;

            default:
                showError("An error occurred during speech playback.");
                resetPlayer();
        }
    }

    function retryCurrentStep() {

        if (!stepsRef) return;

        speechSynthesis.cancel();
        chunkIndex = 0;

        setTimeout(() => {
            play(currentIndex, stepsRef);
        }, 100);
    }

    function resetPlayer() {

        speechSynthesis.cancel();

        state = "idle";
        currentIndex = 0;
        chunkIndex = 0;
        isPausedManually = false;

        updateUI("idle");
    }

    function fallbackToDefaultVoice() {
        const v = speechSynthesis.getVoices();
        if (v.length > 0) api_voice = v[0];
    }

    // =========================
    // 📤 PUBLIC API
    // =========================
    return {
        play,
        pause,
        resume,
        next
    };

})();
    
    play_btn.addEventListener("click", () => {
        SpeechController.play(0, recepy_steps_text);
    });

    play_btn_mobile.addEventListener("click", () => {
        SpeechController.play(0, recepy_steps_text);
    });

    stop_btn_mobile.addEventListener("click", () => {
        SpeechController.pause();
    });

    pause_btn.addEventListener("click", () => {
        SpeechController.pause();
    });

    resume_btn.addEventListener("click", () => {
        SpeechController.resume();
    });

    console.log("number of buttons", step_buttons.length);
    console.log("steps text", recepy_steps_text.length);
    recepy_steps_text.forEach((step, index) => {
        console.log("step", index, "text:", step.dataset.medida);
    })
    

    step_buttons.forEach((btn, index) => {
        console.log("btn index", index);
        btn.addEventListener("click", () => {
            console.log("step btn click", index);
            console.log("step btn click text", recepy_steps_text[index].dataset.medida);
            SpeechController.play(index, recepy_steps_text);    
        });
        
    });

    window.__playerTest__ = { SpeechController, showError, clearError };

  });