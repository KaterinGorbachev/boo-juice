let ingredienteCount = document.querySelectorAll('#ingredientes-container .ingrediente-item').length;
let pasoCount = document.querySelectorAll('.step').length;
let tipCount = document.querySelectorAll('#tips-container .tip-item').length;

const _origInputValues = {};
let _origIngredientesHTML = '';
let _origPasosHTML = '';
let _origTipsHTML = '';

(function captureOriginals() {
    ['nombre_receta', 'descripcion', 'tiempo_preparacion', 'cantidad_porciones', 'video'].forEach(function(f) {
        const el = document.getElementById(f + '_input');
        if (el) _origInputValues[f] = el.value;
    });
    _origIngredientesHTML = document.getElementById('ingredientes-container').innerHTML;
    _origPasosHTML = document.getElementById('pasos-container').innerHTML;
    const tc = document.getElementById('tips-container');
    if (tc) _origTipsHTML = tc.innerHTML;
})();

function toggleEdit(fieldName, btn) {
    const display = document.getElementById(fieldName + '_display');
    const input = document.getElementById(fieldName + '_input');
    const label = document.getElementById(fieldName + '_label');

    if (display.style.display === 'none') {
        display.style.display = '';
        input.style.display = 'none';
        if (label) label.style.display = 'none';
        if (fieldName === 'tiempo_preparacion') {
            const minutes = parseInt(input.value);
            display.textContent = Math.floor(minutes / 60) + 'h ' + (minutes % 60) + 'min';
        } else if (fieldName === 'video') {
            display.textContent = input.value || 'No hay video';
        } else {
            display.textContent = input.value;
        }
    } else {
        display.style.display = 'none';
        input.style.display = 'block';
        if (label) label.style.display = 'block';
        if (btn) btn.style.display = 'none';
    }
}

function toggleEditSection(sectionName, btn) {
    const display = document.getElementById(sectionName + '_display');
    const edit = document.getElementById(sectionName + '_edit');
    const playerBox = sectionName === 'pasos' ? document.getElementById('player-box') : null;

    if (display.style.display === 'none') {
        display.style.display = '';
        edit.style.display = 'none';
        if (playerBox) playerBox.style.display = '';
    } else {
        display.style.display = 'none';
        edit.style.display = 'block';
        if (playerBox) playerBox.style.display = 'none';
        if (btn) btn.style.display = 'none';
    }
}

function cancelarEdicion() {
    ['nombre_receta', 'descripcion', 'tiempo_preparacion', 'cantidad_porciones', 'video'].forEach(function(f) {
        const input = document.getElementById(f + '_input');
        const display = document.getElementById(f + '_display');
        const label = document.getElementById(f + '_label');
        if (input) input.value = _origInputValues[f] !== undefined ? _origInputValues[f] : '';
        if (display) display.style.display = '';
        if (input) input.style.display = 'none';
        if (label) label.style.display = 'none';
    });

    ['ingredientes', 'pasos', 'tips'].forEach(function(s) {
        const display = document.getElementById(s + '_display');
        const edit = document.getElementById(s + '_edit');
        if (display) display.style.display = '';
        if (edit) edit.style.display = 'none';
    });
    const playerBox = document.getElementById('player-box');
    if (playerBox) playerBox.style.display = '';

    document.getElementById('ingredientes-container').innerHTML = _origIngredientesHTML;
    document.getElementById('pasos-container').innerHTML = _origPasosHTML;
    const tc = document.getElementById('tips-container');
    if (tc) tc.innerHTML = _origTipsHTML;

    ingredienteCount = document.querySelectorAll('#ingredientes-container .ingrediente-item').length;
    pasoCount = document.querySelectorAll('#pasos-container .step__edit').length;
    tipCount = tc ? tc.querySelectorAll('.tip-item').length : 0;

    document.querySelectorAll('.editar-btn').forEach(function(btn) {
        btn.style.display = '';
    });
}

function addIngrediente() {
    ingredienteCount++;
    const container = document.getElementById('ingredientes-container');
    const div = document.createElement('div');
    div.className = 'ingrediente-item';
    div.style.marginBottom = '10px';
    div.style.padding = '10px';
    div.style.border = '1px solid #ccc';
    div.innerHTML = `
        <input type="text" name="ingrediente_nombre[]" placeholder="Nombre del ingrediente" required class="ingrediente__edit__form">
        <input type="number" name="ingrediente_cantidad[]" step="0.01" min="0" placeholder="Cantidad" class="cantidad__edit__form">
        <select name="ingrediente_medida[]" required class="measure_select text">
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
        <button type="button" onclick="removeIngrediente(this)" class="outline-button-danger">Eliminar</button>
    `;
    container.appendChild(div);
}

function removeIngrediente(button) {
    button.parentElement.remove();
}

function addPaso() {
    pasoCount++;
    const container = document.getElementById('pasos-container');
    const div = document.createElement('div');
    div.className = 'step__edit';
    div.style.marginBottom = '15px';
    div.style.padding = '10px';
    div.style.border = '1px solid #ccc';
    div.innerHTML = `
        <div class="step_num">
            <span>${pasoCount}</span>
        </div>
        <textarea name="paso_descripcion[]" rows="3" style="width: 100%;"></textarea>
        <button type="button" onclick="removePaso(this)" class="outline-button-danger">Eliminar paso</button>
    `;
    container.appendChild(div);
}

function removePaso(button) {
    button.parentElement.remove();
}

function addTip() {
    tipCount++;
    const tipContainer = document.getElementById('tips-container');
    const div = document.createElement('div');
    div.className = 'tip-item';
    div.style.marginBottom = '10px';
    div.style.padding = '10px';
    div.style.border = '1px solid #ccc';
    div.innerHTML = `
        <textarea name="tips[]" rows="2" style="width: 100%;"></textarea>
        <button type="button" onclick="removeTip(this)" class="outline-button-danger">Eliminar consejo</button>
    `;
    tipContainer.appendChild(div);
}

function removeTip(button) {
    button.parentElement.remove();
}

function convertToYouTubeEmbed(url) {
    if (!url || typeof url !== 'string') return '';
    try {
        const parsed = new URL(url);
        let videoId = null;

        if (parsed.hostname === 'youtu.be') {
            videoId = parsed.pathname.slice(1);
        }
        if (parsed.hostname.includes('youtube.com') && parsed.searchParams.has('v')) {
            videoId = parsed.searchParams.get('v');
        }
        if (parsed.hostname.includes('youtube.com') && parsed.pathname.startsWith('/embed/')) {
            videoId = parsed.pathname.split('/embed/')[1];
        }
        if (parsed.hostname.includes('youtube.com') && parsed.pathname.startsWith('/shorts/')) {
            videoId = parsed.pathname.split('/shorts/')[1];
        }

        if (!videoId) return '';
        return `https://www.youtube-nocookie.com/embed/${videoId}`;
    } catch (e) {
        return '';
    }
}

const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

async function sendRecipeUpdate(recetaId, recipeData) {
    try {
        const response = await fetch(`/api/recipes/${recetaId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
            body: JSON.stringify(recipeData)
        });

        let data = {};
        try {
            data = await response.json();
        } catch {
            throw new Error(`Server returned ${response.status} (non-JSON response)`);
        }

        if (response.status === 400) {
            statePopup((data.error ? data.error : 'Datos inválidos'), '❕');
            return;
        }

        if (!response.ok) {
            statePopup((data.error || response.status || 'HTTP error'), '❌');
            throw new Error(`HTTP error ${response.status}`);
        }

        statePopup('Receta actualizada con éxito', '¡Yupi!', '🫰', 1500, '#a1d44f', '#036310');
        setTimeout(() => { window.location.href = `/receta/${recetaId}`; }, 1500);
    } catch (error) {
        statePopup(String(error), 'Error actualizando receta');
        console.error('Error updating recipe:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('editRecipeForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitEdit();
    });

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            submitEdit();
        });
    }
});

function submitEdit() {
    const form = document.getElementById('editRecipeForm');
    const recetaId = form.dataset.recetaId;

    const name = document.getElementById('nombre_receta_input').value.trim();
    const description = document.getElementById('descripcion_input').value.trim();
    const minutes = Number(document.getElementById('tiempo_preparacion_input').value);
    const servings = Number(document.getElementById('cantidad_porciones_input').value);
    const video = convertToYouTubeEmbed(document.getElementById('video_input').value.trim());

    if (!name || name.length < 2 || name.length > 150) {
        statePopup('Nombre de receta inválido (2-150 caracteres)', '❕');
        return;
    }
    if (!description || description.length < 2 || description.length > 500) {
        statePopup('Descripción inválida (2-500 caracteres)', '❕');
        return;
    }
    if (!Number.isInteger(minutes) || minutes < 1) {
        statePopup('Tiempo de preparación debe ser mayor que 0', '❕');
        return;
    }
    if (!Number.isInteger(servings) || servings < 1) {
        statePopup('Cantidad de porciones debe ser mayor que 0', '❕');
        return;
    }

    const nombreInputs = document.querySelectorAll('#ingredientes-container input[name="ingrediente_nombre[]"]');
    const cantidadInputs = document.querySelectorAll('#ingredientes-container input[name="ingrediente_cantidad[]"]');
    const medidaInputs = document.querySelectorAll('#ingredientes-container select[name="ingrediente_medida[]"]');
    const ingredients = [];
    nombreInputs.forEach((input, i) => {
        const nombre = input.value.trim();
        const cantidad = Number(cantidadInputs[i]?.value) || 0;
        const medida = medidaInputs[i]?.value;
        if (nombre && !isNaN(cantidad) && medida) {
            ingredients.push({ nombre, cantidad, medida });
        }
    });
    if (ingredients.length < 1) {
        statePopup('Introduce al menos un ingrediente', '❕');
        return;
    }

    const stepTextareas = document.querySelectorAll('#pasos-container textarea[name="paso_descripcion[]"]');
    const steps = [];
    stepTextareas.forEach((textarea, i) => {
        const text = textarea.value.trim();
        if (text) steps.push({ id: i + 1, text });
    });
    if (steps.length < 1) {
        statePopup('Introduce al menos un paso de preparación', '❕');
        return;
    }

    const tipInputs = document.querySelectorAll('#tips-container textarea[name="tips[]"]');
    const tips = [];
    tipInputs.forEach((input) => {
        const tip = input.value.trim();
        if (tip) {
            if (tip.length > 200) {
                statePopup('Cada tip debe tener máximo 200 caracteres', '❕');
                throw new Error('tip too long');
            }
            tips.push(tip);
        }
    });

    const recipeData = {
        name,
        description,
        video,
        minutes,
        servings,
        ingredients,
        steps,
        tips
    };

    sendRecipeUpdate(recetaId, recipeData);
}
