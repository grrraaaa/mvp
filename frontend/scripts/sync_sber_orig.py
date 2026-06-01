#!/usr/bin/env python3
"""Sync essential SBBOL static assets from SberOrigWEB into public/sber-orig/static/."""
from __future__ import annotations

import shutil
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SRC_STATIC = ROOT / "SberOrigWEB" / "sbbol.bps-sberbank.by" / "static"
DEST = Path(__file__).resolve().parents[1] / "public" / "sber-orig" / "static"

KEEP_FILES = [
    "main.bundle.css",
    "745.bundle.css",
    "manifest.webmanifest",
]

FONT_FILES = [
    "SBSansInterface/SBSansUI-Light.woff2",
    "SBSansInterface/SBSansUI-Regular.woff2",
    "SBSansInterface/SBSansUI-Semibold.woff2",
    "SBSansInterface/SBSansUI-Bold.woff2",
    "SBSansInterface/SBSansUI-Light.woff",
    "SBSansInterface/SBSansUI-Regular.woff",
    "SBSansInterface/SBSansUI-Semibold.woff",
    "SBSansInterface/SBSansUI-Bold.woff",
]

FONT_BASE = "https://sbbol.bps-sberbank.by/static/fonts/"


def copy_static_bundle() -> None:
    if not SRC_STATIC.is_dir():
        raise SystemExit(f"Missing source folder: {SRC_STATIC}")

    if DEST.exists():
        shutil.rmtree(DEST)
    (DEST / "fonts").mkdir(parents=True, exist_ok=True)

    for name in KEEP_FILES:
        src = SRC_STATIC / name
        if src.is_file():
            shutil.copy2(src, DEST / name)
            print(f"copied {name}")

    fonts_css = SRC_STATIC / "fonts" / "fonts.css"
    if fonts_css.is_file():
        shutil.copy2(fonts_css, DEST / "fonts" / "fonts.css")
        print("copied fonts/fonts.css")


def download_fonts() -> None:
    for rel in FONT_FILES:
        dest = DEST / "fonts" / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        url = FONT_BASE + rel.replace("\\", "/")
        try:
            urllib.request.urlretrieve(url, dest)
            print(f"downloaded {rel}")
        except Exception as exc:
            print(f"skip {rel}: {exc}")


def preserve_images() -> None:
    pub = Path(__file__).resolve().parents[1] / "public" / "sber-orig"
    legacy_images = pub / "images"
    legacy_images.mkdir(parents=True, exist_ok=True)
    for name in ("ic-close.svg", "ic_search.svg"):
        dest = legacy_images / name
        if dest.is_file():
            continue


def cleanup_legacy() -> None:
    pub = Path(__file__).resolve().parents[1] / "public" / "sber-orig"
    for rel in ("css", "js", "index.html"):
        path = pub / rel
        if path.is_file():
            path.unlink()
            print(f"removed {rel}")
        elif path.is_dir():
            shutil.rmtree(path)
            print(f"removed {rel}/")


if __name__ == "__main__":
    copy_static_bundle()
    download_fonts()
    preserve_images()
    cleanup_legacy()
    print("done")
