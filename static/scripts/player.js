document.addEventListener("DOMContentLoaded", () => { 
    //=============================================================
    // functionality to play recepy with https://webaudio.github.io/web-speech-api
    //=============================================================

    //===============
    // function to play step by step
    //===============    

    // 2. get play buttons 
    const play_btn = document.getElementById("play_recepy")
    const pause_btn = document.getElementById("pause_recepy")
    //const play_back = document.getElementById("back_play")
    //const play_next = document.getElementById("next_play")
    const resume_btn = document.getElementById("resume_recepy")
    const step_buttons = document.querySelectorAll(".player-by-step")
    const errorBanner = document.getElementById("speech-error")

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
            pause_btn.classList.remove("hidden");
            resume_btn.classList.add("hidden");
            play_btn.classList.add("hidden");
        }

        if (state === "paused") {
            pause_btn.classList.add("hidden");
            resume_btn.classList.remove("hidden");
        }

        if (state === "idle") {
            pause_btn.classList.add("hidden");
            resume_btn.classList.add("hidden");
            play_btn.classList.remove("hidden");
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
    /* const SpeechController = (() => {

        let state = "idle";
        let currentIndex = 0;
        let chunks = [];
        let chunkIndex = 0;
        let isPausedManually = false;
        let stepsRef = null;

        function updateUI(state) {

            if (state === "playing") {
                pause_btn.classList.remove("hidden");
                resume_btn.classList.add("hidden");
                //const play_next = document.getElementById("next_play")
                //play_next.classList.remove("hidden");
                play_btn.classList.add("hidden");
            }

            if (state === "paused") {
                pause_btn.classList.add("hidden");
                resume_btn.classList.remove("hidden");                
            }

            if (state === "idle") {
                //pause_btn.classList.add("hidden");
                //resume_btn.classList.add("hidden");
                //const play_next = document.getElementById("next_play")
                //play_next.classList.add("hidden");
                play_btn.classList.remove("hidden");
            }
        }

        function play(index, steps) {

            stepsRef = steps;

            currentIndex = index;
            chunkIndex = 0;
            isPausedManually = false;
            state = "playing";

            window.speechSynthesis.onend = null;
            window.speechSynthesis.cancel();

            const step = steps[currentIndex];
            if (!step) return;

            const text = 'Paso ' + (currentIndex + 1) + ': ' + step.dataset.medida;

            chunks = splitText(text);

            speakChunk();
        }

        function pause() {
            
            if (state !== "playing") return;

            if (!speechSynthesis.speaking) {
                console.warn("Nothing to pause (already ended)");
                return;
            }
            
            isPausedManually = true;
            state = "paused";
            window.speechSynthesis.pause();
            
            
        }

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

        function next(stepNumber) {

            console.log("next btn click", "currentIndex:", currentIndex, "speaking:", speechSynthesis.speaking, "paused:", speechSynthesis.paused);

            if (!stepsRef) return;

            if (currentIndex >= stepsRef.length - 1) {
                console.log("Nothing to play state", state);
                speechSynthesis.onend = null;
                speechSynthesis.cancel();
                state = "idle";
                currentIndex = 0;
                updateUI("idle");               
                
                return;
            }

            play(stepNumber, stepsRef);
        }

        function speakChunk() {

            if (state !== "playing") return;

            if (chunkIndex >= chunks.length) {
                return handleStepEnd();
            }

            const currentChunk = chunks[chunkIndex];

            if (!currentChunk) {
                return handleStepEnd();
            }

            const u = new SpeechSynthesisUtterance(currentChunk);

            u.lang = language;
            if (api_voice) u.voice = api_voice;
            u.rate = 0.9;

            let finished = false;

            u.onstart = () => {
                if (state == "playing" || currentIndex === stepsRef.length - 1) {
                    console.log("speak step on start", currentIndex, "chunk:", chunkIndex, currentChunk);                   
                
                    updateUI("playing");
                }
            };

            u.onend = () => {
                if (finished) {
                    updateUI("idle");
                    return;
                }
                finished = true;
                onChunkEnd();
            };

            u.onerror = (e) => {
                if (finished) return;
                finished = true;
                handleSpeechError(e);
            };

            u.onpause = () => { 
                if (state === "paused" && speechSynthesis.paused) {
                    updateUI("paused");
                }
                console.log(
                    "Speech paused on step:",
                    currentIndex,
                    "chunk:",
                    chunkIndex,
                    "elapsedTime:",
                    event.elapsedTime
                );
                
            }

            u.onresume = () => { 
                if (state === "playing" && !speechSynthesis.paused) {
                    updateUI("playing");
                }
            }

            speechSynthesis.speak(u);
        }


        function onChunkEnd() {

            if (!stepsRef) return;

            if (isPausedManually && speechSynthesis.paused) return;

            if (isPausedManually && !speechSynthesis.paused) {
                isPausedManually = false;
            }

            chunkIndex++;
            speakChunk();
        }

        function handleStepEnd() {

            if (!stepsRef) return;

            if (isPausedManually && speechSynthesis.paused) return;

            if (currentIndex >= stepsRef.length - 1 ) {
                state = "idle";
                currentIndex = 0;
                updateUI("idle");
                return;
            }

            play(currentIndex + 1, stepsRef);
        }

        function splitText(text) {
            const MAX = 160;
            const MIN = 10;

            const words = text.replace(/\s+/g, " ").trim().split(" ");
            let result = [];
            let buffer = "";

            for (let word of words) {
                const test = buffer ? buffer + " " + word : word;

                if (test.length <= MAX) {
                    buffer = test;
                } else {
                    result.push(applyPadding(buffer, MIN));
                    buffer = word;
                }
            }

            if (buffer) result.push(applyPadding(buffer, MIN));

            return result;
        }

        function applyPadding(str, minLength) {
            if (str.length < minLength) {
                return str + "...".repeat(3);
            }
            return str;
        }

        // =========================
        // ❌ ERROR HANDLING (ADDED)
        // =========================
        function handleSpeechError(event) {

            if (event.error === "canceled" || event.error === "interrupted") {
                return;
            }

            console.error("Speech error:", event.error);

            switch (event.error) {

                case "audio-busy":
                case "audio-hardware":
                case "synthesis-unavailable":
                case "not-allowed":
                    resetPlayer();
                    break;

                case "network":
                case "synthesis-failed":
                    retryCurrentStep();
                    break;

                case "language-unavailable":
                case "voice-unavailable":
                    fallbackToDefaultVoice();
                    retryCurrentStep();
                    break;

                case "text-too-long":
                    chunks = splitText(chunks.join(" "));
                    chunkIndex = 0;
                    speakChunk();
                    break;

                default:
                    resetPlayer();
            }
        }

        function retryCurrentStep() {

            if (!stepsRef) return;

            speechSynthesis.cancel();

            chunkIndex = 0;

            setTimeout(() => {
                play(currentIndex, stepsRef);
            }, 120);
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

        return {
            play,
            pause,
            resume,
            next
        };
 
})();*/

    /* const SpeechController = (() => {

        // =========================
        // 🔐 STATE
        // =========================
        let state = "idle"; // idle | playing | paused
        let currentIndex = 0;
        let chunks = [];
        let chunkIndex = 0;
        let isPausedManually = false;
        let stepsRef = null;
        let isAdvancing = false;


        // =========================
        // UI UPDATES
        // =========================
        function updateUI(state) {

            if (state === "playing") {
                pause_btn.classList.remove("hidden");
                resume_btn.classList.add("hidden");
                play_next.classList.remove("hidden");
                play_btn.classList.add("hidden");
                
            }

            if (state === "paused") {
                pause_btn.classList.add("hidden");
                resume_btn.classList.remove("hidden");                
                
            }

            if (state === "idle") {
                pause_btn.classList.add("hidden");
                resume_btn.classList.add("hidden");
                play_next.classList.add("hidden");
                play_btn.classList.remove("hidden");
                
            }
        }

        // =========================
        // ▶️ PLAY STEP
        // =========================
        function play(index, steps) {

            stepsRef = steps;

            currentIndex = index;
            chunkIndex = 0;
            isPausedManually = false;
            state = "playing";

            window.speechSynthesis.cancel();

            const step = steps[currentIndex];
            if (!step) return;

            const text = 'Paso ' + (currentIndex + 1) + ': ' + step.dataset.medida;

            chunks = splitText(text);

            speakChunk();
        }

        // =========================
        // ⏸️ PAUSE
        // =========================
        function pause() {
            if (state !== "playing") return;

            isPausedManually = true;
            state = "paused";
            window.speechSynthesis.pause();
        }

        // =========================
        // ▶️ RESUME
        // =========================
        function resume() {

            console.log(
                "resume btn click",
                "currentIndex:", currentIndex,
                "speaking:", speechSynthesis.speaking,
                "paused:", speechSynthesis.paused
            );

            if (state !== "paused") return;

            isPausedManually = false;

            // ✅ CASE 1: normal resume
            if (speechSynthesis.paused) {
                state = "playing";
                speechSynthesis.resume();
                updateUI("playing");
                return;
            }

            // 🔥 CASE 2: race condition (speech already ended)
            if (!speechSynthesis.speaking) {
                console.warn("Nothing to resume → continuing flow");

                state = "playing";

                // continue current flow safely
                speakChunk(); // or handleStepEnd() depending on position

                return;
            }
        }
        // =========================
        // ⏭️ NEXT / PREV
        // =========================
        function next() {

            if (!stepsRef) return;

            // last step → reset like natural flow
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

            const currentChunk = chunks[chunkIndex];

            if (!currentChunk) {
                console.warn("Unexpected empty chunk");
                return handleStepEnd(); // fallback, not silent fail
            }

            const u = new SpeechSynthesisUtterance(chunks[chunkIndex]);

            u.lang = language;
            if (api_voice) u.voice = api_voice;
            u.rate = 0.9;

            u.onstart = () => {
                if (state == "playing" || currentIndex === stepsRef.length - 1) {
                    console.log("speak step on start", currentIndex);                   
                
                    updateUI("playing");
                }
                                
            };

            // 🧠 ONLY FLOW SIGNAL (no logic here)
            u.onend = () => {
                console.log("chunk ended", chunks[chunkIndex], "current step:", currentIndex, "current chunk:", chunkIndex, "stepsLength:", stepsRef ? stepsRef.length : "no steps");
                
                onChunkEnd();
            };

            u.onerror = (e) => {
                console.error("Speech error:", e);
                onChunkEnd();
            };

            u.onpause = () => { 
                // only reflect if controller also paused
                if (state === "paused" && speechSynthesis.paused) {
                    updateUI("paused");
                }
            }

            u.onresume = () => { 
                if (state === "playing") {
                    updateUI("playing");
                }
            }

            speechSynthesis.speak(u);
        }

        // =========================
        // 🧠 CHUNK FLOW CONTROL
        // =========================
        function onChunkEnd() {

            if (!stepsRef) return;

            // real pause → stop everything
            if (isPausedManually && speechSynthesis.paused) return;

            // late pause cleanup (race fix)
            if (isPausedManually && !speechSynthesis.paused) {
                isPausedManually = false;
            }

            
            chunkIndex++;
            console.log("ui state", state);
            
            speakChunk();
        }

        // =========================
        // 🧠 STEP FLOW CONTROL
        // =========================
        function handleStepEnd() {

            if (!stepsRef) return;

            // real pause → stop progression
            if (isPausedManually && speechSynthesis.paused) return;

            if (isPausedManually && !speechSynthesis.paused) {
                isPausedManually = false;
            }

            // end of list
            if (currentIndex >= stepsRef.length - 1 ) {
                console.log("state", state, "paso", currentIndex, "no hay más pasos, reseteando");
                
                state = "idle";
                currentIndex = 0;

                updateUI("idle");
                console.log("state updated to", state);
                
                return;
            } 

            
            // next step
            play(currentIndex + 1, stepsRef);
        }

        // =========================
        // ✂️ TEXT SPLITTER
        // =========================
        function splitText(text) {
            const MAX = 160;
            const MIN = 10;

            const words = text.replace(/\s+/g, " ").trim().split(" ");
            let result = [];
            let buffer = "";

            for (let word of words) {
                const test = buffer ? buffer + " " + word : word;

                if (test.length <= MAX) {
                    buffer = test;
                } else {
                    
                    result.push(applyPadding(buffer, MIN));
                    buffer = word;
                }
            }

            if (buffer) {
                result.push(applyPadding(buffer, MIN));
            }

            return result;
        }

        
        function applyPadding(str, minLength) {
            if (str.length < minLength) {
                
                return str + "...".repeat(3); 
            }
            return str;
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

    })(); */

    play_btn.addEventListener("click", () => {
        SpeechController.play(0, recepy_steps_text);
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