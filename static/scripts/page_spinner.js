(function () {
    const spinner = document.getElementById('page-spinner-overlay');
    if (!spinner) return;

    function showSpinner() {
        spinner.classList.remove('hidden');
    }

    function hideSpinner() {
        spinner.classList.add('hidden');
    }

    hideSpinner();

    const SPINNER_PATH_RE = /^\/(recetas\/?|receta\/\d+\/?|perfil\/[^/]+\/?)$/;

    document.addEventListener('click', function (e) {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        if (
            href.startsWith('#') ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:') ||
            href.startsWith('javascript:')
        ) return;

        if (link.target && link.target !== '_self') return;
        if (link.hasAttribute('download')) return;
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

        try {
            const url = new URL(link.href, window.location.href);
            if (url.origin !== window.location.origin) return;
            if (url.pathname === window.location.pathname && url.hash) return;
            if (!SPINNER_PATH_RE.test(url.pathname)) return;
        } catch (err) {
            return;
        }

        showSpinner();
    });

    window.addEventListener('pageshow', function (e) {
        if (e.persisted) hideSpinner();
    });
})();
