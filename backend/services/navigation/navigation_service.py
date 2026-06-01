from __future__ import annotations
from typing import Optional, List
from models.schemas import NavigationStep
from services.sber_links import SBER_BASE, section_label, section_url


class NavigationService:
    """Путь подсветки на 3D-карте — только официальные URL sber-bank.by."""

    def get_path(self, section: str) -> Optional[List[NavigationStep]]:
        if section in ("home", "default"):
            return [
                NavigationStep(label="Сбер Банк", url=SBER_BASE, icon="home"),
            ]

        url = section_url(section)
        label = section_label(section)
        return [
            NavigationStep(label="Сбер Банк", url=SBER_BASE, icon="home"),
            NavigationStep(label=label, url=url, icon="planet"),
        ]

    def get_full_map(self) -> dict:
        from services.sber_links import SECTION_URLS, PLANET_LABELS

        return {
            "base": SBER_BASE,
            "sections": {
                k: {"label": PLANET_LABELS.get(k, k), "url": v}
                for k, v in SECTION_URLS.items()
                if k in PLANET_LABELS
            },
        }
