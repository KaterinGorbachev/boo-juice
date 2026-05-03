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
    // Restore all simple field inputs and show display elements (edit sections are hidden)
    ['nombre_receta', 'descripcion', 'tiempo_preparacion', 'cantidad_porciones', 'video'].forEach(function(f) {
        const input = document.getElementById(f + '_input');
        const display = document.getElementById(f + '_display');
        const label = document.getElementById(f + '_label');
        if (input) input.value = _origInputValues[f] !== undefined ? _origInputValues[f] : '';
        if (display) display.style.display = '';
        if (input) input.style.display = 'none';
        if (label) label.style.display = 'none';
    });

    // Show all display sections, hide edit sections
    ['ingredientes', 'pasos', 'tips'].forEach(function(s) {
        const display = document.getElementById(s + '_display');
        const edit = document.getElementById(s + '_edit');
        if (display) display.style.display = '';
        if (edit) edit.style.display = 'none';
    });
    const playerBox = document.getElementById('player-box');
    if (playerBox) playerBox.style.display = '';

    // Restore dynamic containers to their original state
    document.getElementById('ingredientes-container').innerHTML = _origIngredientesHTML;
    document.getElementById('pasos-container').innerHTML = _origPasosHTML;
    const tc = document.getElementById('tips-container');
    if (tc) tc.innerHTML = _origTipsHTML;

    ingredienteCount = document.querySelectorAll('#ingredientes-container .ingrediente-item').length;
    pasoCount = document.querySelectorAll('#pasos-container .step__edit').length;
    tipCount = tc ? tc.querySelectorAll('.tip-item').length : 0;

    // Reveal all editar buttons
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
        return `https://www.youtube.com/embed/${videoId}`;
    } catch (e) {
        return '';
    }
}

document.querySelector('.form-edit-recipe').addEventListener('submit', function() {
    const videoInput = document.getElementById('video_input');
    if (videoInput) {
        videoInput.value = convertToYouTubeEmbed(videoInput.value.trim());
    }
});

document.getElementById('portada-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('current-image').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});
