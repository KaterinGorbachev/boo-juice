from playwright.sync_api import sync_playwright
from concurrent.futures import ThreadPoolExecutor

_executor = ThreadPoolExecutor(max_workers=1)
_playwright_instance = None
_browser = None


def _init_browser():
    global _playwright_instance, _browser
    if _browser is not None:
        return
    _playwright_instance = sync_playwright().start()
    _browser = _playwright_instance.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage"]
    )


def _do_generate_pdf(html_content):
    _init_browser()  # lazy: only runs on first PDF request
    context = _browser.new_context()
    page = context.new_page()
    try:
        page.set_content(html_content, wait_until="domcontentloaded")
        pdf_bytes = page.pdf(
            format="A4",
            margin={"top": "1cm", "right": "1cm", "bottom": "1cm", "left": "1cm"},
            header_template="<div></div>",
            footer_template="""
                <div style="width:100%; font-size:10px; text-align:center; color:#999;">
                    Página <span class="pageNumber"></span> de <span class="totalPages"></span>
                </div>
            """,
            display_header_footer=True,
            print_background=True
        )
    finally:
        page.close()
        context.close()
    return pdf_bytes


def generate_pdf(html_content):
    return _executor.submit(_do_generate_pdf, html_content).result()
