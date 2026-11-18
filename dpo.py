from graph_dpo.cli import main
from graph_dpo.rewrite import apply_dpo

__all__ = ["apply_dpo", "main"]

if __name__ == "__main__":
    raise SystemExit(main())
