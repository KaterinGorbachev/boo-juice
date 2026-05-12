let stateTimeout;

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



// ===== DRAFT PERSISTENCE =====
const DRAFT_KEY = 'boo_juice_recipe_draft';
let _saveDraftTimer;

function saveFormDraft() {
  clearTimeout(_saveDraftTimer);
  _saveDraftTimer = setTimeout(() => {
    const ingredientNames   = document.querySelectorAll('input[name="ingredients[]"]');
    const ingredientAmounts = document.querySelectorAll('input[name="amounts[]"]');
    const ingredientMeasures= document.querySelectorAll('select[name="measures[]"]');
    const ingredients = [];
    ingredientNames.forEach((el, i) => {
      ingredients.push({
        nombre:   el.value,
        cantidad: ingredientAmounts[i]?.value  ?? '',
        medida:   ingredientMeasures[i]?.value ?? ''
      });
    });

    const steps = Array.from(document.querySelectorAll('textarea[name="steps[]"]')).map(t => t.value);
    const tips  = Array.from(document.querySelectorAll('input[name="tips[]"]')).map(t => t.value);

    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      name:        document.getElementById("recipe_name")?.value        ?? '',
      description: document.getElementById("recipe_description")?.value ?? '',
      hours:       document.querySelector('input[name="hours"]')?.value  ?? '',
      minutes:     document.querySelector('input[name="minutes"]')?.value ?? '',
      servings:    document.getElementById("servings")?.value            ?? '',
      video:       document.getElementById("recipe_video")?.value        ?? '',
      ingredients,
      steps,
      tips
    }));
  }, 500);
}

function clearFormDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function loadFormDraft() {
  let draft;
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    draft = JSON.parse(saved);
  } catch {
    localStorage.removeItem(DRAFT_KEY);
    return;
  }

  // basic fields
  if (draft.name)        document.getElementById("recipe_name").value        = draft.name;
  if (draft.description) document.getElementById("recipe_description").value = draft.description;
  const hoursEl = document.querySelector('input[name="hours"]');
  if (hoursEl   && draft.hours)    hoursEl.value   = draft.hours;
  const minutesEl = document.querySelector('input[name="minutes"]');
  if (minutesEl && draft.minutes)  minutesEl.value = draft.minutes;
  if (draft.servings) document.getElementById("servings").value       = draft.servings;
  if (draft.video)    document.getElementById("recipe_video").value   = draft.video;

  // ingredients — fill first static row, then click-add the rest
  if (draft.ingredients?.length) {
    const allNames    = document.querySelectorAll('input[name="ingredients[]"]');
    const allAmounts  = document.querySelectorAll('input[name="amounts[]"]');
    const allMeasures = document.querySelectorAll('select[name="measures[]"]');
    if (allNames[0])    allNames[0].value    = draft.ingredients[0].nombre;
    if (allAmounts[0])  allAmounts[0].value  = draft.ingredients[0].cantidad;
    if (allMeasures[0]) allMeasures[0].value = draft.ingredients[0].medida;

    for (let i = 1; i < draft.ingredients.length; i++) {
      document.getElementById("btn_add_ingredient").click();
      const names    = document.querySelectorAll('input[name="ingredients[]"]');
      const amounts  = document.querySelectorAll('input[name="amounts[]"]');
      const measures = document.querySelectorAll('select[name="measures[]"]');
      const last = names.length - 1;
      names[last].value    = draft.ingredients[i].nombre;
      amounts[last].value  = draft.ingredients[i].cantidad;
      measures[last].value = draft.ingredients[i].medida;
    }
  }

  // steps — fill first static textarea, then click-add the rest
  if (draft.steps?.length) {
    const firstStep = document.querySelector('textarea[name="steps[]"]');
    if (firstStep) firstStep.value = draft.steps[0];
    for (let i = 1; i < draft.steps.length; i++) {
      document.getElementById("btn_add_paso").click();
      const textareas = document.querySelectorAll('textarea[name="steps[]"]');
      textareas[textareas.length - 1].value = draft.steps[i];
    }
  }

  // tips — all are dynamically created
  if (draft.tips?.length) {
    for (const tip of draft.tips) {
      document.getElementById("btn_add_tip").click();
      const tipInputs = document.querySelectorAll('input[name="tips[]"]');
      tipInputs[tipInputs.length - 1].value = tip;
    }
  }
}
// ===== END DRAFT PERSISTENCE =====



const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

const sendRecipe = async (recipeData) => {
  try {
    const response = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
      body: JSON.stringify(recipeData)
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      throw new Error(`Server returned ${response.status} (non-JSON response)`);
    }

    

    if (response.status === 400) {
      
      
      statePopup((data.error ? data.error : 'Invalid data'), '❕')
      
      
      return
    }

    if (!response.ok) {
      
      statePopup((response.status ? response.status : 'HTTP error'), '❌')
      
      
      throw new Error(`HTTP error ${response.status}`);
    }

    if(response.status === 200){
      clearFormDraft();
      document.querySelectorAll('input').forEach((input) => {
        input.value = ''

      })
      document.querySelectorAll('textarea').forEach(input => input.value = '')
      document.querySelectorAll('select').forEach(input => input.value = '')

      const ingredientsFieldset = document.getElementById("ingredients_fieldset");
      if (ingredientsFieldset) {
        const ingBlocks = ingredientsFieldset.querySelectorAll(".ingredient__input");
        ingBlocks.forEach((block, i) => { if (i > 0) block.remove(); });
        ingBlocks[0]?.querySelectorAll(".btn_remove_ingredient").forEach(b => b.classList.add("hidden"));
      }

      const pasosFieldset = document.getElementById("pasos_fieldset");
      if (pasosFieldset) {
        const stepBlocks = pasosFieldset.querySelectorAll(".step__input");
        stepBlocks.forEach((block, i) => { if (i > 0) block.remove(); });
        const firstLabel = pasosFieldset.querySelector(".step__input .step_label_num");
        if (firstLabel) firstLabel.textContent = "Paso 1";
        pasosFieldset.querySelectorAll(".step__input .btn_remove_paso").forEach(b => b.classList.add("hidden"));
      }

      const tipsFieldset = document.getElementById("tips_fieldset");
      if (tipsFieldset) {
        const tipBlocks = tipsFieldset.querySelectorAll(".tip");
        tipBlocks.forEach((block, i) => { if (i > 0) block.remove(); });
        tipsFieldset.querySelectorAll(".tip .btn_remove_tip").forEach(b => b.classList.add("hidden"));
      }

    }

    
    statePopup('Receta creada con exito', '¡Yupi!','🫰', 1500, '#a1d44f','#036310' )
    
    
    console.log("Saved recipe:", data);

    


  } catch (error) {
    statePopup(error , 'Error sending recipe')
    console.error("Error sending recipe:", error);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("recipeForm");

   if (!form) {
    console.error("❌ Form not found");
    return;
  }

  const ingredientsFieldset = document.getElementById("ingredients_fieldset");
  const addIngredients = document.getElementById("btn_add_ingredient");

  const pasosFieldset = document.getElementById("pasos_fieldset");
  const addPasos = document.getElementById("btn_add_paso");

  const tipsFieldset = document.getElementById("tips_fieldset");
  const addTip = document.getElementById("btn_add_tip")

  const pasos_btns = document.getElementById('pasos_btns')

  function updateIngredientRemoveButtons() {
    const blocks = ingredientsFieldset.querySelectorAll(".ingredient__input");
    const show = blocks.length > 1;
    blocks.forEach(block => {
      const btn = block.querySelector(".btn_remove_ingredient");
      if (btn) btn.classList.toggle("hidden", !show);
    });
  }

  function renumberPasos() {
    const blocks = pasosFieldset.querySelectorAll(".step__input");
    blocks.forEach((block, i) => {
      const label = block.querySelector(".step_label_num");
      if (label) label.textContent = `Paso ${i + 1}`;
    });
    const show = blocks.length > 1;
    blocks.forEach(block => {
      const btn = block.querySelector(".btn_remove_paso");
      if (btn) btn.classList.toggle("hidden", !show);
    });
  }

  function updateTipRemoveButtons() {
    const blocks = tipsFieldset.querySelectorAll(".tip");
    const show = blocks.length > 1;
    blocks.forEach(block => {
      const btn = block.querySelector(".btn_remove_tip");
      if (btn) btn.classList.toggle("hidden", !show);
    });
  }

  // wire up the static first ingredient's remove button
  ingredientsFieldset.querySelectorAll(".ingredient__input").forEach(block => {
    const btn = block.querySelector(".btn_remove_ingredient");
    if (btn && !btn.dataset.wired) {
      btn.dataset.wired = "1";
      btn.addEventListener("click", () => {
        block.remove();
        updateIngredientRemoveButtons();
        saveFormDraft();
      });
    }
  });

  // wire up the static first step's remove button
  pasosFieldset.querySelectorAll(".step__input").forEach(block => {
    const btn = block.querySelector(".btn_remove_paso");
    if (btn && !btn.dataset.wired) {
      btn.dataset.wired = "1";
      btn.addEventListener("click", () => {
        block.remove();
        renumberPasos();
        saveFormDraft();
      });
    }
  });

  // wire up the static first tip's remove button
  tipsFieldset.querySelectorAll(".tip").forEach(block => {
    const btn = block.querySelector(".btn_remove_tip");
    if (btn && !btn.dataset.wired) {
      btn.dataset.wired = "1";
      btn.addEventListener("click", () => {
        block.remove();
        updateTipRemoveButtons();
        saveFormDraft();
      });
    }
  });


  // add tips
  addTip.addEventListener("click", () => {

    const container = document.createElement("div");
    container.classList.add("tip");
    container.classList.add("input-message-box");


    container.innerHTML = `

      <input type="text" name="tips[]" maxlength="200" placeholder="Tu secreto para cocinar delicioso y rápido" class="text">
      <small class="small_input ">0/200 caracteres</small>

    `
    const removeButton = document.createElement("button");
    removeButton.classList.add("outline-button-danger", "btn_remove_tip");
    removeButton.type = "button";
    removeButton.textContent = "- Eliminar tip";
    removeButton.addEventListener("click", () => {
      container.remove();
      updateTipRemoveButtons();
      saveFormDraft();
    });

    container.appendChild(removeButton);

    tipsFieldset.insertBefore(container, addTip);
    updateTipRemoveButtons();


  })

  // add steps
  addPasos.addEventListener("click", () => {
    const container = document.createElement("div");
    container.classList.add("step__input");
    container.innerHTML = `
        <label class="small-title step_label_num"></label>
        <textarea name="steps[]" placeholder="Ejemplo: recoger polvo de estrellas" class="step_description"></textarea>
    `;

    const removeButton = document.createElement("button");
    removeButton.classList.add("outline-button-danger", "btn_remove_paso");
    removeButton.type = "button";
    removeButton.textContent = "- Eliminar paso";
    removeButton.addEventListener("click", () => {
      container.remove();
      renumberPasos();
      saveFormDraft();
    });
    container.appendChild(removeButton);

    pasosFieldset.insertBefore(container, pasos_btns);
    renumberPasos();
  });

  // add ingredients
  addIngredients.addEventListener("click", () => {
    const container = document.createElement("div");
    container.classList.add("ingredient__input");

    container.innerHTML = `
      <input type="text" name="ingredients[]" placeholder="Ingrediente" required class="ingredient" list="ingredientes-list">

        <div class="input__left_label">
          <input type="number" name="amounts[]" step="0.125" min="0" placeholder="Cantidad"  class="num_input">
          <select name="measures[]" required class="measure_select">
            <option value="">Medida</option>
            <option value="pieza">pieza</option>
            <option value="g">g</option>
            <option value="kg">kg</option>
            <option value="cuchara">cuchara</option>
            <option value="cucharadita">cucharadita</option>
            <option value="taza">taza</option>
            <option value="ml">ml</option>
            <option value="l">l</option>
            <option value="al gusto">al gusto</option>
            <option value="pizca">pizca</option>

          </select>

        </div>
    `;

    const removeButton = document.createElement("button");
    removeButton.classList.add("outline-button-danger", "btn_remove_ingredient");
    removeButton.type = "button";
    removeButton.textContent = "- Eliminar ingrediente";
    removeButton.addEventListener("click", () => {
      container.remove();
      updateIngredientRemoveButtons();
      saveFormDraft();
    });
    container.appendChild(removeButton);

    ingredientsFieldset.insertBefore(container, addIngredients);
    updateIngredientRemoveButtons();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // ===== BASIC FIELDS =====
    // add checks for input
    const name = document.getElementById("recipe_name").value.trim();
    const description = document.getElementById("recipe_description").value.trim();

    const hours = Number(document.querySelector('input[name="hours"]')?.value || 0);
    const minutes = Number(document.querySelector('input[name="minutes"]')?.value || 0);

    const servings = Number(document.getElementById("servings").value.trim())
    //const portada = document.getElementById("recipe_cover").value.trim()
    const portada = ""
    

    // function to create video useful link 
    function convertToYouTubeEmbed(url) {
      if (!url || typeof url !== 'string') return ''

      try {
        const parsedUrl = new URL(url)
        let videoId = null

        // youtu.be/VIDEO_ID
        if (parsedUrl.hostname === 'youtu.be') {
          videoId = parsedUrl.pathname.slice(1)
        }

        // youtube.com/watch?v=VIDEO_ID
        if (parsedUrl.hostname.includes('youtube.com') && parsedUrl.searchParams.has('v')) {
          videoId = parsedUrl.searchParams.get('v')
        }

        // youtube.com/embed/VIDEO_ID (already embedded)
        if (parsedUrl.hostname.includes('youtube.com') && parsedUrl.pathname.startsWith('/embed/')) {
          videoId = parsedUrl.pathname.split('/embed/')[1]
        }

        // youtube.com/shorts/VIDEO_ID (YouTube Shorts)
        if (parsedUrl.hostname.includes('youtube.com') && parsedUrl.pathname.startsWith('/shorts/')) {
          videoId = parsedUrl.pathname.split('/shorts/')[1]
        }

        if (!videoId) return ''

        return `https://www.youtube-nocookie.com/embed/${videoId}`
      } catch (error) {

        console.error('Video link convert error:',error);
        return ''
      }
    }

    const video = convertToYouTubeEmbed(document.getElementById("recipe_video").value.trim())


    const totalMinutes = hours * 60 + minutes;

    // ===== INGREDIENTS =====
    const ingredientNames = document.querySelectorAll('input[name="ingredients[]"]');
    const ingredientAmounts = document.querySelectorAll('input[name="amounts[]"]');
    const ingredientMeasures = document.querySelectorAll('select[name="measures[]"]');

    const ingredients = [];

    // add checks for input
    ingredientNames.forEach((input, index) => {
      const nombre = input.value.trim();
      const cantidad = Number(ingredientAmounts[index]?.value) || 0;
      const medida = ingredientMeasures[index]?.value;

      if (nombre && !isNaN(cantidad) && medida) {
        ingredients.push({
          nombre,
          cantidad,
          medida
        });
      }
    });

    // ===== STEPS =====
    const stepTexts = document.querySelectorAll('textarea[name="steps[]"]');
    const stepPhotos = document.querySelectorAll('input[name="step_photos[]"]');

    const steps = [];

    // add checks for input
    stepTexts.forEach((textarea, index) => {
      const text = textarea.value.trim();
      const photo = stepPhotos[index]?.files[0] || '';

      if (text) {
        steps.push({
          id: index + 1,
          text,
          photo
        });
      }
    });

    // ===== TIPS =====

    const recepyTips = document.querySelectorAll('input[name="tips[]"]');
    const tips = [];

    recepyTips.forEach(input => {
        const tip = input.value.trim();

        if (tip) {
            tips.push(tip)
        }
    })


    // ===== FINAL OBJECT =====
    //==== checks NOT NULL data =====
    if (!name) {
        alert('Introduce el nombre de la receta')
        return
    }
    else if (!description) {
        alert('Cuentanos algo sobre la receta en descripción')
        return
    }
    /* else if (totalMinutes == 0){
        alert('Introduce el tiempo de preparación aproximadamente')
        return
    } */
    else if (ingredients.length < 1){
        alert('Introduce al menos un ingrediente')
        return
    }
    else if (!document.querySelector('textarea[name="steps[]"]')?.value.trim()){
        statePopup('Introduce al menos un paso de preparación')
        return
    }
    

    const recipeData = {
      name,
      description,
      portada,
      video,
      minutes: totalMinutes,
      servings,
      ingredients,
      steps, 
      tips
    };

    const test_receta = recipeData

    console.log(recipeData);
    

    // ===== SEND TO BACKEND =====
    try {
      sendRecipe(recipeData)
    }
    catch (error) {
        console.error('After sending data', error);

    }


  })

  // save draft on any form input change
  form.addEventListener("input", saveFormDraft);
  form.addEventListener("change", saveFormDraft);

  // restore draft after all listeners are set up so .click() handlers work
  loadFormDraft();

  // refresh remove-button visibility and step numbers after draft restore
  updateIngredientRemoveButtons();
  renumberPasos();
  updateTipRemoveButtons();

})

