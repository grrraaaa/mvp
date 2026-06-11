"""Pytest config — оборачиваем async-тесты через anyio (без pytest-asyncio)."""
import inspect

import anyio
import pytest


def pytest_pyfunc_call(pyfuncitem):
    """Перехватываем async-тесты и запускаем через anyio.run."""
    testfunc = pyfuncitem.obj
    if inspect.iscoroutinefunction(testfunc):
        anyio.run(testfunc)
        return True
    return None
