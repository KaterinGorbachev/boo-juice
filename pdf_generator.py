try:
    from weasyprint import HTML
except (ImportError, OSError) as e:
    raise RuntimeError(
        "WeasyPrint failed to load — system libraries missing. "
        "On Debian/Ubuntu run: apt-get install libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b"
    ) from e

## testing version--------------------
""" try:
    from weasyprint import HTML
    _weasyprint_available = True
except OSError:
    _weasyprint_available = False """
#-----------------------------------------

def generate_pdf(html_content, base_url=None):
    # if not _weasyprint_available:
    #     raise RuntimeError(
    #         "WeasyPrint requires the GTK3 runtime on Windows. "
    #         "Install it from: https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases"
    #     )
    return HTML(string=html_content, base_url=base_url).write_pdf()
