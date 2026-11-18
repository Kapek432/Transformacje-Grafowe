import argparse
import json
import logging
from pathlib import Path

from .exports import write_outputs
from .rewrite import apply_dpo

logger = logging.getLogger(__name__)


def _unique_keys(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Powtórzony klucz JSON {key!r}.")
        result[key] = value
    return result


def main() -> int:
    """Run the command-line interface and return its exit status."""
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(
        description="Zastosuj jedną regułę DPO do grafu z JSON."
    )
    parser.add_argument("input", type=Path, help="plik z grafem, regułą i dopasowaniem")
    parser.add_argument(
        "--output-dir", type=Path, default=Path("wynik"), help="katalog wyników"
    )
    parser.add_argument(
        "--csv", action="store_true", help="zapisz również trzy tabele CSV"
    )
    parser.add_argument(
        "--excel", action="store_true", help="zapisz również wynik.xlsx"
    )
    args = parser.parse_args()

    try:
        data = json.loads(
            args.input.read_text(encoding="utf-8-sig"), object_pairs_hook=_unique_keys
        )
        host, result = apply_dpo(data)
        json_path = write_outputs(
            args.input,
            args.output_dir,
            host,
            result,
            csv_export=args.csv,
            excel_export=args.excel,
        )
    except (ValueError, OSError) as exc:
        logger.error("Błąd: %s", exc)
        return 1

    if "edge_id" in result:
        logger.info(
            "Reguła odrzucona. Krawędź %r straciłaby koniec. Wynik: %s",
            result["edge_id"],
            json_path,
        )
        return 3
    logger.info("Reguła zastosowana. Wynik: %s", json_path)
    return 0
