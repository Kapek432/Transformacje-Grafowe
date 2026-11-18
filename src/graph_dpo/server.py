import argparse
import logging
import threading
import webbrowser
from pathlib import Path

import uvicorn

from .api import create_app

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
HOST = "127.0.0.1"


def main() -> None:
    """Serve the web interface on localhost and open it in the browser."""
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(description="Interfejs graficzny DPO.")
    parser.add_argument("--port", type=int, default=8000, help="port serwera")
    parser.add_argument(
        "--no-browser", action="store_true", help="nie otwieraj przeglądarki"
    )
    args = parser.parse_args()

    static_dir = PROJECT_ROOT / "frontend" / "dist"
    if not static_dir.is_dir():
        logger.warning(
            "Brak frontend/dist. Zbuduj interfejs: "
            "cd frontend && npm install && npm run build"
        )
    url = f"http://{HOST}:{args.port}"
    if not args.no_browser:
        # Delay opening so the browser does not hit the port before uvicorn binds it.
        threading.Timer(1.0, webbrowser.open, args=(url,)).start()
    logger.info("Interfejs DPO: %s", url)
    uvicorn.run(
        create_app(PROJECT_ROOT / "examples", static_dir), host=HOST, port=args.port
    )