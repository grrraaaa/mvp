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
