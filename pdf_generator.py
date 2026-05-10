try:
    from weasyprint import HTML
except (ImportError, OSError) as e:
    raise RuntimeError(
        "WeasyPrint failed to load — system libraries missing. "
        "On Debian/Ubuntu run: apt-get install libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b"
    ) from e


def generate_pdf(html_content, base_url=None):
    return HTML(string=html_content, base_url=base_url).write_pdf()
