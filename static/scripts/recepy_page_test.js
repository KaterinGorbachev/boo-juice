// change number of ingredients

document.addEventListener("DOMContentLoaded", () => {

    //==============================================
    // function to calculate ingredientes 1/2 -1 -2
    //==================================================
    const buttons_ingredients_size = document.querySelectorAll(".btns__box button");
    const ingredients = document.querySelectorAll(".ingredientes__list li");

    const formatFraction = (value) => {
        const fractionMap = {
            0.125: '1/8',
            0.25: '1/4',
            0.3333333333: '1/3',
            0.5: '1/2',
            0.6666666667: '2/3',
            0.75: '3/4',
            1: '1'
        };

        const absValue = Math.abs(value);
        const whole = Math.floor(absValue);
        const remainder = parseFloat((absValue - whole).toFixed(10));

        const match = Object.keys(fractionMap).find(key => Math.abs(remainder - parseFloat(key)) < 0.00001);
        const fraction = match ? fractionMap[match] : null;

        if (fraction) {
            if (whole === 0) {
                return (value < 0 ? '-' : '') + fraction;
            }
            return `${value < 0 ? '-' : ''}${whole} ${fraction}`;
        }

        return Number(value.toFixed(2)).toString().replace(/\.0$/, '');
    };

    buttons_ingredients_size.forEach(button => {        

        button.addEventListener("click", () => {  
            
            buttons_ingredients_size.forEach(btn=>btn.classList.remove("active"))
                
            // Add active to clicked one
            button.classList.add("active");
            const factor = parseFloat(button.dataset.factor);

            ingredients.forEach(item => {
                if (!item.dataset.base) {
                    return
                }
                if (isNaN(parseFloat(item.dataset.base))) {
                    
                    return;
                }
                const base = parseFloat(item.dataset.base);
                const medida = item.dataset.medida;
                const nombre = item.dataset.nombre;

                const newValue = base * factor;

                if(newValue != 0 ){
                    item.textContent = 
                        `${formatFraction(newValue)} ${medida} - ${nombre}`;
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
    /* const get_all_text = (array_of_text_parts) => {
        let fullText = ""
        array_of_text_parts.forEach((item, index) => {
            const num_text = index+1
            fullText += `${num_text}. ${item}. `;

        })
        
        return fullText
    }
 */
    //===============
    // function to play all text 
    //===============
    /* const play_all_at_once = (text) => {
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
            play_btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="play_svg" fill="currentColor">
                <path d="M91.2 36.9c-12.4-6.8-27.4-6.5-39.6 .7S32 57.9 32 72l0 368c0 14.1 7.5 27.2 19.6 34.4s27.2 7.5 39.6 .7l336-184c12.8-7 20.8-20.5 20.8-35.1s-8-28.1-20.8-35.1l-336-184z"/>
            </svg>`;
            speechSynthesis.cancel()
        };

        u.onpause = function(event) {
            console.log("Paused at " + event.elapsedTime + " seconds.");
        };

        speechSynthesis.speak(u);
        play_btn.innerText = "Pause";

    }
 */

    //===============
    // function to play step by step
    //===============

    

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

    // variable for play instance of SpeechSynthesisUtterance class
    

    // timer for longer pauses  between steps
    let delayTimer = null;

    // helper for play_btn control
    let isPlaying = false;

    // functions to handle speech errors
    const retryCurrentStep = (index, recepy_steps_text) => {
        speechSynthesis.cancel();
        setTimeout(() => {
            playFromIndex(index, recepy_steps_text);
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

    const splitAndSpeak = (index, recepy_steps_text) => {
        console.warn("Text too long. Splitting...");
        const step = recepy_steps_text[index];
        const sentences = step.dataset.medida.split(". ");
    
        function speakSentence(i) {
            if (i >= sentences.length) {
                playFromIndex(index + 1, recepy_steps_text);
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
        //play
        play_btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="play_svg" fill="currentColor">
                <path d="M91.2 36.9c-12.4-6.8-27.4-6.5-39.6 .7S32 57.9 32 72l0 368c0 14.1 7.5 27.2 19.6 34.4s27.2 7.5 39.6 .7l336-184c12.8-7 20.8-20.5 20.8-35.1s-8-28.1-20.8-35.1l-336-184z"/>
            </svg>`

        // stop
        play_back.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="change_play_step_svg" fill="currentColor">
                <path d="M64 32l320 0c35.3 0 64 28.7 64 64l0 320c0 35.3-28.7 64-64 64L64 480c-35.3 0-64-28.7-64-64L0 96C0 60.7 28.7 32 64 32z"/>
            </svg>`

        //next
        play_next.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" class="change_play_step_svg" fill="currentColor">
                <path d="M21 36.8c12.9-7 28.7-6.3 41 1.8L320 208.1 320 64c0-17.7 14.3-32 32-32s32 14.3 32 32l0 384c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-144.1-258 169.6c-12.3 8.1-28 8.8-41 1.8S0 454.7 0 440L0 72C0 57.3 8.1 43.8 21 36.8z"/>
            </svg>`

        play_back.classList.add("hidden")
        play_next.classList.add("hidden")

        if (delayTimer) {
            clearTimeout(delayTimer);
            delayTimer = null;
        }

        speechSynthesis.cancel();
    }

    // control errors 
    function handleSpeechError(event, index, recepy_steps_text) {

        
        if (event.error === "canceled" || event.error === "interrupted") {
            console.error("Audio flow changed", event.error)
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
                retryCurrentStep(index, recepy_steps_text);
                break;
    
            case "synthesis-unavailable":
                alert("Speech engine unavailable.");
                resetPlayer();
                break;
    
            case "synthesis-failed":
                alert("Speech synthesis failed.");
                retryCurrentStep(index, recepy_steps_text);
                break;
    
            case "language-unavailable":
                console.warn("Requested language not available. Falling back.");
                fallbackToDefaultVoice();
                retryCurrentStep(index, recepy_steps_text);
                break;
    
            case "voice-unavailable":
                console.warn("Selected voice unavailable. Falling back.");
                fallbackToDefaultVoice();
                retryCurrentStep(index, recepy_steps_text);
                break;
    
            case "text-too-long":
                console.warn("Text too long. Splitting...");
                splitAndSpeak(index, recepy_steps_text);
                break;
    
            case "invalid-argument":
                console.warn("Invalid rate/pitch/volume. Resetting.");
                resetSpeechSettings();
                retryCurrentStep(index, recepy_steps_text);
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

    const nextStep = (recepy_steps_text, index) => {
        

        if (!recepy_steps_text || recepy_steps_text.length === 0) {
            return;
        }

        // If we are already at the last step, just stop
        if (index === recepy_steps_text.length-1) {            
            play_next.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="change_play_step_svg" fill="currentColor">
                <path d="M64 32l320 0c35.3 0 64 28.7 64 64l0 320c0 35.3-28.7 64-64 64L64 480c-35.3 0-64-28.7-64-64L0 96C0 60.7 28.7 32 64 32z"/>
            </svg>`
        }

        index++

        
        if (index >= recepy_steps_text.length) {            
            resetPlayer();
            return;
        }

        

        return index
       
    }

    

    // back step function
    const backStep = (recepy_steps_text, index) => {
        
        if (!recepy_steps_text || recepy_steps_text.length === 0) {
            return;
        }
         // Go to previous step, but never below 0
        index-- 

        if (index === 0) { 
            console.log('i am here ');
            
            play_back.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="change_play_step_svg" fill="currentColor">
                <path d="M64 32l320 0c35.3 0 64 28.7 64 64l0 320c0 35.3-28.7 64-64 64L64 480c-35.3 0-64-28.7-64-64L0 96C0 60.7 28.7 32 64 32z"/>
            </svg>`
            

        }       

        if (index < 0){ 
            resetPlayer();
            return

        }

        return index
    }

    


    // main function to speak by steps 
    const speakStep = (text, index, recepy_steps_text) => {
   
        

        //get step 
        // const step = recepy_steps_text[index];

        // //if step is empty         
        // if (!step || !step.dataset.medida.trim()) {
        //     console.warn("Invalid step at index:", index);
        //     currentStep++;
        //     speakStep(currentStep);
        //     return;
        // }

        // ❌ add for different language paso - step - etc
        
        
        utterance = new SpeechSynthesisUtterance(text);        

        try {          
            
            utterance.lang = language;
            
            // Optional voice
            if (api_voice) {
                utterance.voice = api_voice;
            } 

            utterance.onstart = () => {
                console.log("Speaking step", index + 1);
                // pause
                play_btn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" class="play_svg" fill="currentColor">
                    <path d="M48 32C21.5 32 0 53.5 0 80L0 432c0 26.5 21.5 48 48 48l64 0c26.5 0 48-21.5 48-48l0-352c0-26.5-21.5-48-48-48L48 32zm224 0c-26.5 0-48 21.5-48 48l0 352c0 26.5 21.5 48 48 48l64 0c26.5 0 48-21.5 48-48l0-352c0-26.5-21.5-48-48-48l-64 0z"/>
                </svg>
                
                `
            }; 

            utterance.onend = () => {
                console.log("Finished step", index + 1);
                playFromIndex(index + 1, recepy_steps_text);
            };

            utterance.onerror = (event) => {
                handleSpeechError(event, index, recepy_steps_text);
            };

            utterance.onpause = (event) => {
                console.log("Paused at", event.elapsedTime);
            };

            console.log("now is speaking:", utterance);

            speechSynthesis.speak(utterance);

        } catch (error) {
            console.error("Speech failed:", error);
            resetPlayer();
        }

        
    }


    // play step by step function 
    const play_step_by_step = (step) => {
        
        // // If we are already in "step by step" mode and currently speaking → toggle pause/resume
        // if (isPlaying && speechSynthesis.speaking) {

        //     if (speechSynthesis.paused) {
        //         speechSynthesis.resume();
        //         // pause 
        //         play_btn.innerHTML = `
        //         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" class="play_svg" fill="currentColor">
        //             <path d="M48 32C21.5 32 0 53.5 0 80L0 432c0 26.5 21.5 48 48 48l64 0c26.5 0 48-21.5 48-48l0-352c0-26.5-21.5-48-48-48L48 32zm224 0c-26.5 0-48 21.5-48 48l0 352c0 26.5 21.5 48 48 48l64 0c26.5 0 48-21.5 48-48l0-352c0-26.5-21.5-48-48-48l-64 0z"/>
        //         </svg>
                
        //         `
        //     } else {
        //         speechSynthesis.pause();
        //         //play 
        //         play_btn.innerHTML = `
        //         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="play_svg" fill="currentColor">
        //             <path d="M91.2 36.9c-12.4-6.8-27.4-6.5-39.6 .7S32 57.9 32 72l0 368c0 14.1 7.5 27.2 19.6 34.4s27.2 7.5 39.6 .7l336-184c12.8-7 20.8-20.5 20.8-35.1s-8-28.1-20.8-35.1l-336-184z"/>
        //         </svg>
                
        //         `
        //     }

        //     return;
        // }

        // Start a new sequence: stop anything that might already be speaking
        speechSynthesis.cancel();

        // Reset state
        isPlaying = true;
        speakStep(step);
    };


let currentIndex = 0;
let recepy_steps_text = null;
let playFromIndex = null;

const updateButtons = () => {
    if (!recepy_steps_text) return;
    if (currentIndex > 0) {
        play_back.classList.remove("hidden");
    } else {
        play_back.classList.add("hidden");
    }
    if (currentIndex < recepy_steps_text.length - 1) {
        play_next.classList.remove("hidden");
    } else {
        play_next.classList.add("hidden");
    }
};

const speakSingleStep = (index) => {
    currentIndex = index;
    updateButtons();
    const step = recepy_steps_text[index];
    const text = `Paso ${index + 1}: ${step.dataset.medida}... ... `;
    utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    if (api_voice) {
        utterance.voice = api_voice;
    }
    utterance.onstart = () => {
        isPlaying = true;
        play_btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" class="play_svg" fill="currentColor">
            <path d="M48 32C21.5 32 0 53.5 0 80L0 432c0 26.5 21.5 48 48 48l64 0c26.5 0 48-21.5 48-48l0-352c0-26.5-21.5-48-48-48L48 32zm224 0c-26.5 0-48 21.5-48 48l0 352c0 26.5 21.5 48 48 48l64 0c26.5 0 48-21.5 48-48l0-352c0-26.5-21.5-48-48-48l-64 0z"/>
        </svg>
        `;
    };
    utterance.onend = () => {
        resetPlayer();
    };
    utterance.onerror = (event) => {
        handleSpeechError(event, index, recepy_steps_text);
    };
    utterance.onpause = (event) => {
        console.log("Paused at", event.elapsedTime);
    };
    speechSynthesis.speak(utterance);
};

play_btn.addEventListener("click", () => {
    recepy_steps_text = document.querySelectorAll(".step");
    console.log("Steps to speak", recepy_steps_text)
    let utterance = null;

    // Safety check if there are no text to speak 
    // also jinja template check added - if no steps -> no buttons visible
    if (!recepy_steps_text || recepy_steps_text.length === 0) {
        console.error("No recipe steps found");
        resetPlayer();
        return;
    }

    playFromIndex = (index) => {
        currentIndex = index;
        updateButtons();
        if (index >= recepy_steps_text.length) {
            resetPlayer();
            return;
        }
        isPlaying = true;
        const step = recepy_steps_text[index];
        const text = `Paso ${index + 1}: ${step.dataset.medida}... ... `;
        speakStep(text, index, recepy_steps_text);
    };

    if (!isPlaying) {
        isPlaying = true;
        playFromIndex(currentIndex);
    } else {
        resetPlayer();
    }
    }); 

play_next.addEventListener("click", () => {
    if (recepy_steps_text && currentIndex < recepy_steps_text.length - 1) {
        speechSynthesis.cancel();
        currentIndex++;
        updateButtons();
    }
});

play_back.addEventListener("click", () => {
    if (recepy_steps_text && currentIndex > 0) {
        speechSynthesis.cancel();
        currentIndex--;
        updateButtons();
    }
});

//=============================================
    // resize video 
    //=================================================
    const wrapper = document.getElementById("video-resizer-wrapper");
    const handle = document.getElementById("resize-handle");
    let isResizing = false;

    if (wrapper && handle) {    

        handle.addEventListener("pointerdown", function (e) {
            isResizing = true;
            handle.setPointerCapture(e.pointerId);
        });

        document.addEventListener("pointermove", function (e) {
            if (!isResizing) return;

            const rect = wrapper.getBoundingClientRect();
            const newWidth = Math.max(250, e.clientX - rect.left);

            wrapper.style.width = newWidth + "px";
        });

        document.addEventListener("pointerup", function () {
            isResizing = false;
        });
    }
    //=================================================

   
})






