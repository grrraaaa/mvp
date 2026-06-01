<<<<<<< HEAD
﻿from __future__ import annotations
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
=======
import json
from pathlib import Path
from models.schemas import NavigationStep


APP_MAP_PATH = Path(__file__).parent.parent.parent.parent / "ai" / "knowledge" / "app_map.json"


class NavigationService:
    def __init__(self):
        with open(APP_MAP_PATH, encoding="utf-8") as f:
            self._map = json.load(f)

    def get_path(self, section: str) -> list[NavigationStep] | None:
        """Построить breadcrumb-путь к разделу от главной страницы."""
        sections = self._map.get("sections", {})

        if section not in sections:
            return None

        # Всегда начинаем с главной
        path = [NavigationStep(label="Главная", url="/", icon="home")]

        target = sections[section]

        # Найти родителя (упрощённо — прямые дочерние разделы главной)
        home_children = sections.get("home", {}).get("children", [])
        if section in home_children:
            path.append(NavigationStep(
                label=target["label"],
                url=target["url"],
                icon=target.get("icon"),
            ))
        else:
            # Найти промежуточный родительский раздел
            for parent_key, parent_data in sections.items():
                if "children" in parent_data and section in parent_data["children"]:
                    path.append(NavigationStep(
                        label=parent_data["label"],
                        url=parent_data["url"],
                        icon=parent_data.get("icon"),
                    ))
                    path.append(NavigationStep(
                        label=target["label"],
                        url=target["url"],
                        icon=target.get("icon"),
                    ))
                    break

        return path
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
