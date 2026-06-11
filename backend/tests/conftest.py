"""Pytest config — оборачиваем async-тесты через asyncio (без pytest-asyncio).

Пробрасываем фикстуры (monkeypatch, request, ...) в async-тест через kwargs,
иначе anyio.run(func) вызовет функцию без аргументов и упадёт.
"""
import asyncio
import inspect


def pytest_pyfunc_call(pyfuncitem):
    """Перехватываем async-тесты и запускаем через asyncio.run с фикстурами."""
    testfunc = pyfuncitem.obj
    if inspect.iscoroutinefunction(testfunc):
        # funcargs уже содержит все зарезолвленные фикстуры для этой функции
        asyncio.run(testfunc(**pyfuncitem.funcargs))
        return True
    return None
