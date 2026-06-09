import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.navigation.demo_routes import match_demo_route
tests = [
    'наименование контрагента ООО Ромашка',
    'открой выписку',
    'покажи кредиты',
    'перейди в настройки',
    'перейди в контрагенты',
]
for m in tests:
    print(f'{repr(m)} -> {match_demo_route(m)}')
