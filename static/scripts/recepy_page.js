function statePopup(message, title="Error", icon="🐈‍⬛", duration=4000, colorElementsBorder="#cc3c3c", colorElementsBack="#ff4b4b"){

    clearTimeout(stateTimeout); 

    const overlay = document.getElementById("state-popup-overlay");
    const timerBar = document.getElementById("state-timer");

    document.getElementById("state-icon").innerText = icon;
    document.getElementById("state-title").innerText = title;
    document.getElementById("state-message").innerText = message;
    const btn = document.getElementById("state-btn")
    btn.style.background = colorElementsBack
    btn.style.boxShadow = `0 4px 0 ${colorElementsBorder}`

    

    overlay.classList.remove("hidden");

    timerBar.style.transition = "none";
    timerBar.style.width = "100%";

    setTimeout(()=>{
        timerBar.style.transition = `width ${duration}ms linear`;
        timerBar.style.width = "0%";
    },50);

    stateTimeout = setTimeout(()=>{
        stateClose();
    }, duration);
}

function stateClose(){
    document.getElementById("state-popup-overlay").classList.add("hidden");
    clearTimeout(stateTimeout);
}


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
            return `${value < 0 ? '-' : ''}${whole} y ${fraction}`;
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
    // function to play step by step
    //===============    

    

 

    //play step by step clean variables
    // variable for play instance of SpeechSynthesisUtterance class
    
    
    // functions to handle speech errors
    // const retryCurrentStep = (index, recepy_steps_text) => {
    //     speechSynthesis.onend = null; 
    //     speechSynthesis.cancel();
    //     setTimeout(() => {
    //         speakStep(index, recepy_steps_text);
    //     }, 500);
    // }

    // const fallbackToDefaultVoice = () => {
    //     voices = speechSynthesis.getVoices();
    //     api_voice = voices.find(v => v.lang.startsWith("es")) || voices[0];
    // }
    
    // const resetSpeechSettings = () => {
    //     utterance.rate = 1;
    //     utterance.pitch = 1;
    //     utterance.volume = 1;
    // }

    // const splitAndSpeak = (index, recepy_steps_text) => {
    //     console.warn("Text too long. Splitting properly...");

    //     // Get current step
    //     const step = recepy_steps_text[index];

    //     if (!step) return;

    //     // Full text to speak
    //     const rawText = 'Paso ' + (index + 1) + ': ' + step.dataset.medida;

    //     // Maximum chunk length
    //     const MAX_LENGTH = 300;

    //     // Final array of chunks
    //     let chunks = [];

    //     // Normalize spaces and line breaks
    //     let text = rawText.replace(/\s+/g, " ").trim();

    //     // Build chunks without splitting words
    //     let words = text.split(" ");
    //     let currentChunk = "";

    //     words.forEach(word => {
    //         // Check if adding next word exceeds max size
    //         if ((currentChunk + " " + word).trim().length <= MAX_LENGTH) {
    //             currentChunk += (currentChunk ? " " : "") + word;
    //         } else {
    //             // Save current chunk
    //             chunks.push(currentChunk);

    //             // Start new chunk with current word
    //             currentChunk = word;
    //         }
    //     });

    //     // Push final remaining chunk
    //     if (currentChunk) {
    //         chunks.push(currentChunk);
    //     }

    //     // 3. Speak chunks sequentially
    //     const speakChunk = (i) => {
    //         if (i >= chunks.length) {
    //             if (!isPausedManually) {
    //                 speakStep(index + 1, recepy_steps_text);
    //             }
    //             return;
    //         }

    //         let utterance = new SpeechSynthesisUtterance(chunks[i]);

    //         utterance.lang = language;
    //         if (api_voice) utterance.voice = api_voice;
    //         utterance.rate = 0.9;

    //         utterance.onstart = () => {
    //             console.log(`Speaking chunk ${i + 1}/${chunks.length} of step ${index + 1}`);
    //             isPausedManually = false;
    //             isSpeakingActive = true;
    //             pause_btn.classList.remove("hidden");
    //             play_btn.classList.add("hidden");
    //             resume_btn.classList.add("hidden");
                

    //         }

    //         utterance.onpause = (event) => {
    //             console.log("Paused at", event.elapsedTime);
                
    //         };

    //         utterance.onend = () => {
    //             if (isPausedManually && speechSynthesis.paused) {
    //                 return;
    //             }
    //             if (isPausedManually && !speechSynthesis.paused) {
    //                 // pause happened after speech ended → ignore it
    //                 isPausedManually = false;
    //             }
    //             isSpeakingActive = false;

    //             // Small delay improves UX for accessibility
    //             setTimeout(() => speakChunk(i + 1), 120);
    //         }

    //         utterance.onerror = (e) => {
    //             console.error("Chunk error:", e);
    //             isSpeakingActive = false;
    //             speakChunk(i + 1); // skip error and continue
    //         };

    //         window.speechSynthesis.speak(utterance);
    //     };

    //     speakChunk(0);
    // };

    // // function for play_btn control in an error case and to stop speechSynthesis
    // const resetPlayer = ()=> {        
    //     pause_btn.classList.add("hidden")
    //     play_btn.classList.remove("hidden")
    //     speechSynthesis.onend = null; 
    //     speechSynthesis.cancel();
    //     isSpeakingActive = false;
    //     isPausedManually = false;
    // }

    // // control errors 
    // function handleSpeechError(event, index, recepy_steps_text) {

        
    //     if (event.error === "canceled" || event.error === "interrupted") {
    //         console.error("Audio flow changed", event.error)
    //         return;
    //     }
    //     console.error("Speech error:", event.error);
    //     // Ignore normal control-flow events
    
    //     switch (event.error) {           
    
    
    //         case "audio-busy":
    //             // use custom alert instead of browser one for better UX and to avoid confusion with play/pause controls
    //             setTimeout(() => {
    //                 statePopup('Audio device is busy. Please close other audio applications.', '¡Ups!','🤖', 2500, '#ff4b4b','#cc3c3c' )
    //             }, 500)
                
    //             resetPlayer();
    //             break;
    
    //         case "audio-hardware":
    //             setTimeout(() => {
    //                 statePopup('Audio output device error. Please check your speakers or headphones.', '¡Ups!','🔊', 2500, '#ff4b4b','#cc3c3c' )
    //             }, 500)
    //             resetPlayer();
    //             break;
    
    //         case "network":
    //             setTimeout(() => {
    //                 statePopup('Network error during speech synthesis. Please check your connection.', '¡Ups!','🌐', 2500, '#ff4b4b','#cc3c3c' )
    //             }, 500)
    //             retryCurrentStep(index, recepy_steps_text);
    //             break;
    
    //         case "synthesis-unavailable":
    //             setTimeout(() => {
    //                 statePopup('Speech synthesis service is unavailable. Please try again later.', '¡Ups!','🤖', 2500, '#ff4b4b','#cc3c3c' )
    //             }, 500)
    //             resetPlayer();
    //             break;
    
    //         case "synthesis-failed":
    //             setTimeout(() => {
    //                 statePopup('Speech synthesis failed. Please try again.', '¡Ups!','🤖', 2500, '#ff4b4b','#cc3c3c' )
    //             }, 500)
    //             retryCurrentStep(index, recepy_steps_text);
    //             break;
    
    //         case "language-unavailable":
    //             console.warn("Requested language not available. Falling back.");
    //             fallbackToDefaultVoice();
    //             retryCurrentStep(index, recepy_steps_text);
    //             break;
    
    //         case "voice-unavailable":
    //             console.warn("Selected voice unavailable. Falling back.");
    //             fallbackToDefaultVoice();
    //             retryCurrentStep(index, recepy_steps_text);
    //             break;
    
    //         case "text-too-long":
    //             console.warn("Text too long. Splitting...");
    //             splitAndSpeak(index, recepy_steps_text);
    //             break;
    
    //         case "invalid-argument":
    //             console.warn("Invalid rate/pitch/volume. Resetting.");
    //             resetSpeechSettings();
    //             retryCurrentStep(index, recepy_steps_text);
    //             break;
    
    //         case "not-allowed":
    //             setTimeout(() => {
    //                 statePopup('Speech blocked. Please interact with the page first.', '¡Ups!','🚫', 2500, '#ff4b4b','#cc3c3c' )
    //             }, 500) 
    //             resetPlayer();
    //             break;
    
    //         default:
    //             console.warn("Unknown speech error:", event.error);
    //             setTimeout(() => {
    //                 statePopup('An unexpected error occurred during speech synthesis.', '¡Ups!','❌', 2500, '#ff4b4b','#cc3c3c' )
    //             }, 500)
    //             resetPlayer();
    //     }
    // }

    // //centralized controller 
    // const controller = {

    //     handleChunkEnd(stepIndex) {

    //         isSpeakingActive = false;

    //         // ignore if paused correctly
    //         if (isPausedManually && speechSynthesis.paused) return;

    //         // fix late pause
    //         if (isPausedManually && !speechSynthesis.paused) {
    //             isPausedManually = false;
    //         }

    //         // end of steps
    //         if (stepIndex === recepy_steps_text.length - 1) {
    //             this.reset();
    //             return;
    //         }

    //         this.next(stepIndex);
    //     },

    //     next(index) {
    //         playStep(index + 1, recepy_steps_text);
    //     },

    //     reset() {
    //         pause_btn.classList.add("hidden");
    //         play_btn.classList.remove("hidden");
    //         resume_btn.classList.add("hidden");
    //         currentIndex = 0;
    //     }
    // };

    // // main function to create utterance
    // const speakStep = (index, recepy_steps_text) => { 
    //     // stop any ongoing speech and reset onend to avoid multiple triggers if user clicks play multiple times quickly
    //     window.speechSynthesis.onend = null;        
    //     window.speechSynthesis.cancel();
    //     //get step 
    //     const step = recepy_steps_text[index];
        
    //     // check if index out of range
    //     if (index < 0 || index >= recepy_steps_text.length) {
    //         console.error(`Index ${index} out of range. No more steps to speak.`);
    //         return null;
    //     }
    //     // get text to speak from data attribute
    //     const text = 'Paso ' + (index + 1) + ': ' + step.dataset.medida;
    //     // check if text is too long for some browsers and split if necessary (some browsers have limits around 200-300 chars)
    //     if (text.length > 240) {
    //         console.warn("Text too long. Splitting...");
    //         splitAndSpeak(index, recepy_steps_text);
    //         return;
    //     }


    //     // create new instance of SpeechSynthesisUtterance for step  
    //     let utterance = new SpeechSynthesisUtterance(text);        

    //     try {         
            
    //         utterance.lang = language;
            
    //         // Optional voice
    //         if (api_voice) {
    //             utterance.voice = api_voice;
    //         } 

    //         utterance.rate = 0.9; 

    //         utterance.onstart = () => {
    //             console.log("Speaking step", index + 1);
    //             // show controls only when speech starts to avoid confusion if user clicks play and then immediately pause or next before speech starts
    //             // play_back.classList.toggle("hidden", index === 0);
    //             // play_next.classList.toggle("hidden", index === recepy_steps_text.length - 1);
    //             isPausedManually = false;
    //             isSpeakingActive = true;
    //             pause_btn.classList.remove("hidden");
    //             play_btn.classList.add("hidden");
    //             resume_btn.classList.add("hidden");
    //         }; 

    //         utterance.onend = () => {
    //             isSpeakingActive = false;
    //             console.log("Finished step", index + 1);
    //             if (isPausedManually && speechSynthesis.paused) {
    //                 return;
    //             }
    //             if (isPausedManually && !speechSynthesis.paused) {
    //                 // pause happened after speech ended → ignore it
    //                 isPausedManually = false;
    //             }
    //             if (index == recepy_steps_text.length - 1) {
    //                 // play_back.classList.add("hidden");
    //                 // play_next.classList.add("hidden");
    //                 pause_btn.classList.add("hidden");
    //                 play_btn.classList.remove("hidden");
    //                 resume_btn.classList.add("hidden");
    //                 index = 0;
    //             } else {
                                        
    //                 speakStep(index + 1, recepy_steps_text);
                    
    //             }
                
    //         };

    //         utterance.onerror = (event) => {
    //             handleSpeechError(event, index, recepy_steps_text);
    //         };

    //         utterance.onpause = (event) => {
    //             console.log("Paused at", event.elapsedTime);
                
                
    //         };

    //         window.speechSynthesis.speak(utterance);

    //     } catch (error) {
    //         console.error("Utterance creation failed:", error);

    //     }

        
    // }

    



    // // event listener for play button
    // play_btn.addEventListener("click", () => {
        
    //     //check browser support
    //     if (!('speechSynthesis' in window)) {
    //         setTimeout(() => {
    //             statePopup('Tu navegador no soporta síntesis de voz', '¡Ups!','🤖', 2500, '#ff4b4b','#cc3c3c' )
    //         }, 500)
    //         return;
    //     }
        
    //     // Prevent multiple clicks while speaking
    //     if (speechSynthesis.speaking || speechSynthesis.pending) {
    //         return;
    //     }
    //     const steps = document.querySelectorAll('.step'); 
    //     console.log(steps);
    //     play_btn.classList.add("hidden");
    //     pause_btn.classList.remove("hidden");
    //     speakStep(currentIndex, steps);
        
        

    // });

    // // Pause button
    // pause_btn.addEventListener("click", () => {
    //     if (!speechSynthesis.speaking || !isSpeakingActive) {
    //         return;
    //     }
    //     isPausedManually = true;
    //     speechSynthesis.pause();

    //     pause_btn.classList.add("hidden");
    //     resume_btn.classList.remove("hidden");
        
    // });

    // // Resume button
    // resume_btn.addEventListener("click", () => {
    //     // 🚨 Prevent resume if nothing is paused
    //     if (!speechSynthesis.paused || !isSpeakingActive) {
    //         console.warn("Nothing to resume");
            
    //         // Optional: auto-continue next step instead
    //         // speakStep(currentIndex + 1, recepy_steps_text);
            
    //         resume_btn.classList.add("hidden");
    //         pause_btn.classList.add("hidden");
    //         play_btn.classList.remove("hidden");

    //         return;
    //     }

    //     isPausedManually = false;
    //     speechSynthesis.resume();

    //     resume_btn.classList.add("hidden");
    //     pause_btn.classList.remove("hidden");
            
    // });





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
            const parentWidth = wrapper.parentElement.getBoundingClientRect().width;
            const newWidth = Math.min(parentWidth, Math.max(250, e.clientX - rect.left));

            wrapper.style.width = newWidth + "px";
        });

        document.addEventListener("pointerup", function () {
            isResizing = false;
        });
    }
    //=================================================

   
})
