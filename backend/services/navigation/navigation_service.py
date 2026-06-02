from __future__ import annotations
from typing import Optional, List
from models.schemas import NavigationStep
from services.sber_links import section_label, section_url


class NavigationService:
    """Путь подсветки на карте разделов — внутренние маршруты SBBOL."""

    def get_path(self, section: str) -> Optional[List[NavigationStep]]:
        if section in ("home", "default"):
            return [NavigationStep(label="Главная", url="/", icon="home")]

        url = section_url(section)
        label = section_label(section)
        steps = [NavigationStep(label="Главная", url="/", icon="home")]

        top = url.split("/")[1] if url.startswith("/") and url.count("/") >= 1 else ""
        top_paths = {
            "payments": ("Расчёты", "/payments"),
            "statement": ("Выписка", "/statement"),
            "salary": ("Зарплата", "/salary"),
            "products": ("Продукты", "/products"),
            "services": ("Сервисы", "/services"),
            "other": ("Прочее", "/other"),
            "settings": ("Настройки", "/settings"),
        }
        if top in top_paths and url != top_paths[top][1]:
            t_label, t_url = top_paths[top]
            steps.append(NavigationStep(label=t_label, url=t_url, icon="planet"))

        steps.append(NavigationStep(label=label, url=url, icon="planet"))
        return steps

    def get_full_map(self) -> dict:
        from services.sber_links import SECTION_PATHS, PLANET_LABELS

        return {
            "base": "/",
            "sections": {
                k: {"label": PLANET_LABELS.get(k, k), "url": v}
                for k, v in SECTION_PATHS.items()
                if k in PLANET_LABELS
            },
        }
