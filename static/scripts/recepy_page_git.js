// change number of ingredients

document.addEventListener("DOMContentLoaded", () => {

    //==============================================
    // function to calculate ingredientes 1/2 -1 -2
    //==================================================
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

    //===========================================================================

    //=============================================================
    // function to keep screen active only for Chrome Android 
    //=============================================================
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

    //===========================================================================

    //=============================================================
    // functionality to play recepy with https://webaudio.github.io/web-speech-api
    //=============================================================

    //===============
    // function to get all text 
    //===============
    const get_all_text = (array_of_text_parts) => {
        let fullText = ""
        array_of_text_parts.forEach((item, index) => {
            const num_text = index+1
            fullText += `${num_text}. ${item}. `;

        })
        
        return fullText
    }

    //===============
    // function to play all text 
    //===============
    const play_all_at_once = (text) => {
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

        u = new SpeechSynthesisUtterance(text);
        u.lang = "es-ES";      
        
        if(api_voice){ 
            u.voice = api_voice
        }
       

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


    //===============
    // function to play step by step
    //===============

    // 1. get all steps 
    const recepy_steps_text = document.querySelectorAll(".step")

    // 2. get play buttons 
    const play_btn = document.getElementById("play_recepy")
    const play_back = document.getElementById("back_play")
    const play_next = document.getElementById("next_play")

    // 3. get voice for html lang tag 
    var api_voice = null

    // all voices provided by browser and OS
    let voices = speechSynthesis.getVoices();
    
    // get a lang from html --> for future functionality if page has different languages
    // default language is Spanish
    let lang = document.documentElement.lang || "es"
    let language = "es-ES"

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

    

    //play step by step clean variables

    // global variable to control playing 
    var currentStep = 0;

    // variable for play instance of SpeechSynthesisUtterance class
    let utterance = null;

    // timer for longer pauses  between steps
    let delayTimer = null;

    // helper for play_btn control
    let isPlaying = false;

    // functions to handle speech errors
    const retryCurrentStep = () => {
        speechSynthesis.cancel();
        setTimeout(() => {
            speakStep(currentStep);
        }, 500);
    }

    const fallbackToDefaultVoice = () => {
        voices = speechSynthesis.getVoices();
        api_voice = voices.find(v => v.lang.startsWith("es")) || voices[0];
    }
    
    const resetSpeechSettings = () => {
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
    }

    const splitAndSpeak = () => {
        console.warn("Text too long. Splitting...");
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

    // function for play_btn control in an error case and to stop speechSynthesis
    const resetPlayer = ()=> {

        isPlaying = false;
        play_btn.innerText = "Escuchar";
        play_back.classList.add("hidden")
        play_next.classList.add("hidden")

        if (delayTimer) {
            clearTimeout(delayTimer);
            delayTimer = null;
        }

        speechSynthesis.cancel();
    }

    // control errors 
    function handleSpeechError(event) {

        
        if (event.error === "canceled" || event.error === "interrupted") {
            console.log("Audio flow changed", event.error)
            return;
        }
        console.error("Speech error:", event.error);
        // Ignore normal control-flow events
    
        switch (event.error) {           
     
    
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

    // next step function

    const nextStep = () => {
        console.log("nextStep called");

        if (!recepy_steps_text || recepy_steps_text.length === 0) {
            return;
        }

        currentStep++

        // If we are already at the last step, just stop
        if (currentStep >= recepy_steps_text.length) {
            play_next.innerText = 'Stop'
            resetPlayer();
            return;
        }

        // Stop current speech immediately and go to the next step
        speechSynthesis.cancel();
        isPlaying = true;
        speakStep(currentStep);
       
    }

    play_next.addEventListener("click", nextStep);

    // back step function
    const backStep = () => {
        console.log("backStep called");

        if (!recepy_steps_text || recepy_steps_text.length === 0) {
            return;
        }

        if (currentStep === 0) { 
            play_back.innerText = 'Stop'
            resetPlayer();
            return

        }

        // Go to previous step, but never below 0
        currentStep = Math.max(currentStep - 1, 0); 

        // Stop current speech immediately and go to the next step
        speechSynthesis.cancel();
        speakStep(currentStep);
    }

    play_back.addEventListener("click", backStep);


    // main function to speak by steps 
    const speakStep = (index) => {
        console.log(index);
        

        // Safety check if there are no text to speak 
        // also jinja template check added - if no steps -> no buttons visible
        if (!recepy_steps_text || recepy_steps_text.length === 0) {
            console.error("No recipe steps found");
            resetPlayer();
            return;
        }

        console.log(recepy_steps_text.length);       

        // Finished all steps
        if (index >= recepy_steps_text.length) {
            
            resetPlayer();
            return;
        }

        // show back and next buttons
        if (index > 0 || index < recepy_steps_text.length) { 
            play_back.classList.remove("hidden")
            play_next.classList.remove("hidden")

        } 

        //get step 
        const step = recepy_steps_text[index];

        //if step is empty         
        if (!step || !step.dataset.medida.trim()) {
            console.warn("Invalid step at index:", index);
            currentStep++;
            speakStep(currentStep);
            return;
        }

        // ❌ add for different language paso - step - etc
        const text = `Paso ${index + 1}: ${step.dataset.medida}... ... `;
        console.log(text);

        utterance = new SpeechSynthesisUtterance(text);        

        try {          
            
            utterance.lang = language;
            
            // Optional voice
            if (api_voice) {
                utterance.voice = api_voice;
            } 

            utterance.onstart = () => {
                console.log("Speaking step", index + 1);
                play_btn.innerText = "Pause";
            }; 

            utterance.onend = () => {
                console.log("Finished step", index + 1);
                currentStep++;
                speakStep(currentStep)                
            };

            utterance.onerror = (event) => {
                handleSpeechError(event);
            };

            utterance.onpause = (event) => {
                console.log("Paused at", event.elapsedTime);
            };

            console.log(utterance);

            speechSynthesis.speak(utterance);

        } catch (error) {
            console.error("Speech failed:", error);
            resetPlayer();
        }

        
    }


    // play step by step function 
    const play_step_by_step = () => {
        console.log("play_step_by_step called, speaking:", speechSynthesis.speaking);

        // If we are already in "step by step" mode and currently speaking → toggle pause/resume
        if (isPlaying && speechSynthesis.speaking) {

            if (speechSynthesis.paused) {
                speechSynthesis.resume();
                play_btn.innerText = "Pause";
            } else {
                speechSynthesis.pause();
                play_btn.innerText = "Resume";
            }

            return;
        }

        // Start a new sequence: stop anything that might already be speaking
        speechSynthesis.cancel();

        // Reset state
        currentStep = 0;
        isPlaying = true;

        speakStep(currentStep);
    };


    play_btn.addEventListener("click", () => {
        console.log("play_btn clicked");          
        console.log("speechSynthesis:", speechSynthesis);  
        play_step_by_step()
    }); 
 

   
})
