(function () {
    const btn = document.getElementById('load-more-btn');
    if (!btn) return;

    const fallbackImages = JSON.parse(btn.dataset.fallbacks);
    const originalHTML = btn.innerHTML;

    btn.addEventListener('click', async function () {
        if (btn.disabled) return;

        const nextPage = parseInt(btn.dataset.nextPage, 10);
        btn.disabled = true;
        btn.textContent = 'Cargando...';

        try {
            const response = await fetch(`/recetas/more?page=${nextPage}`);
            if (!response.ok) throw new Error('Network error');
            const result = await response.json();

            const grid = document.querySelector('.grid');
            result.items.forEach(function (item) {
                const imgSrc = item.portada || fallbackImages[Math.floor(Math.random() * fallbackImages.length)];

                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.id = 'receta_id_' + item.id;

                const imgBox = document.createElement('div');
                imgBox.className = 'img-box';
                const img = document.createElement('img');
                img.src = imgSrc;
                img.alt = item.nombre_receta;
                img.width = 400;
                img.height = 300;
                img.loading = 'lazy';
                img.decoding = 'async';
                imgBox.appendChild(img);

                const link = document.createElement('a');
                link.className = 'title-box';
                link.href = '/receta/' + item.id;
                const h2 = document.createElement('h2');
                h2.textContent = item.nombre_receta;
                link.appendChild(h2);

                cell.appendChild(imgBox);
                cell.appendChild(link);
                grid.appendChild(cell);
            });

            if (result.has_more) {
                btn.dataset.nextPage = nextPage + 1;
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            } else {
                btn.classList.remove('action-button');
                btn.classList.add('outline-button-neutral');
                btn.textContent = 'No hay más';
                btn.disabled = true;
            }
        } catch (err) {
            console.error(err);
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    });
})();
