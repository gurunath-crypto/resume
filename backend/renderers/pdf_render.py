"""
HTML -> PDF using Playwright (bundled Chromium = full CSS fidelity, no system deps).

First run requires: python -m playwright install chromium
"""

from __future__ import annotations

from playwright.sync_api import sync_playwright


def html_to_pdf(html: str) -> bytes:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            page = browser.new_page()
            page.set_content(html, wait_until="networkidle")
            pdf = page.pdf(
                format="A4",
                print_background=True,
                margin={"top": "10mm", "bottom": "10mm", "left": "10mm", "right": "10mm"},
            )
        finally:
            browser.close()
    return pdf
