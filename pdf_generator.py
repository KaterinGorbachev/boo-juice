try:
    from weasyprint import HTML
    _weasyprint_available = True
except OSError:
    _weasyprint_available = False


def generate_pdf(html_content):
    if not _weasyprint_available:
        raise RuntimeError(
            "WeasyPrint requires the GTK3 runtime on Windows. "
            "Install it from: https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases"
        )
    return HTML(string=html_content).write_pdf()
