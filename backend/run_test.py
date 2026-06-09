# Тест: запускает uvicorn с startup events и выводит всё в консоль
import uvicorn
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
os.chdir(r"C:\Users\New\Desktop\sber\mvp\backend")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=[r"C:\Users\New\Desktop\sber\mvp\backend"],
        log_level="info",
        lifespan="on",
    )
