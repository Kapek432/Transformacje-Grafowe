# DPO w transformacjach grafowych

Program wykonuje jeden krok Double Pushout na skończonym grafie skierowanym. Dane wejściowe zawierają graf, regułę i ręcznie wskazane dopasowanie. Pętle i równoległe krawędzie są dozwolone.

## Uruchomienie

Z katalogu `dpo`, z Pythonem 3.11+ i `uv`:

```sh
uv run python dpo.py examples/slide8.json --output-dir wynik/udany --csv --excel
uv run python dpo.py examples/slide8_rejected.json --output-dir wynik/odrzucony --csv --excel
```

Każde uruchomienie na poprawnym wejściu zapisuje `output.json`. Flaga `--csv` zapisuje dodatkowo `wierzcholki.csv`, `krawedzie.csv` i `status.csv`. Pliki używają UTF-8 z BOM oraz średnika jako separatora. Identyfikatory wyglądające jak formuły są w CSV poprzedzane apostrofem. Flaga `--excel` zapisuje te same tabele w trzech arkuszach pliku `wynik.xlsx`, z identyfikatorami zapisanymi jako tekst. W tabelach wierzchołków i krawędzi kolumna `etap` pozwala wybrać stan grafu. Przy udanej transformacji są trzy etapy. Przy odrzuceniu eksport zawiera graf wejściowy oraz przyczynę odrzucenia.

Kod wyjścia `0` oznacza wykonaną transformację, `3` odrzucenie reguły z zapisem wyniku, a `1` błąd danych lub pliku. Domyślny katalog wyjściowy to `wynik`. Polecenia używają osobnych podkatalogów, żeby wyniki obu prób były dostępne obok siebie.

## Jak działa reguła

- `graph` to graf wejściowy \(G\). Każdy graf ma `nodes`, czyli listę tekstowych identyfikatorów, oraz `edges`, czyli listę obiektów `id`, `source`, `target`.
- `rule.L` opisuje szukany fragment, `rule.K` elementy zachowane, a `rule.R` fragment po zmianie. Elementy zachowane mają te same identyfikatory w `K`, `L` i `R`. Element spoza `K` jest traktowany jako osobny element po każdej stronie reguły.
- `match.nodes` i `match.edges` mapują osobno wszystkie identyfikatory z `L` na identyfikatory w `G`. Mapowania są różnowartościowe, a dopasowanie krawędzi zachowuje źródło i cel.
- Program sprawdza, czy usunięcie elementów z \(L \setminus K\) pozostawiłoby krawędź bez końca. Jeśli tak, zwraca `dangling_edge` oraz identyfikator tej krawędzi. W przeciwnym razie tworzy graf pośredni `intermediate_graph` i dołącza elementy z \(R \setminus K\) przez zachowaną część, tworząc `result_graph`.

Przykład `slide8.json` odwzorowuje skierowane krawędzie z ostatniego slajdu „SPO I DPO”. Program usuwa `E` wraz z `D → E` i `F → E` oraz usuwa `D → F`. Zachowuje `D` i `F` z ich pozostałymi połączeniami, po czym dodaje `M`, `N` i pięć krawędzi z `R`. Litery z rysunku służą jako identyfikatory. W `slide8_rejected.json` dodatkowa krawędź `E → C` blokuje tę samą regułę.

## Gdzie jest kod

`dpo.py` uruchamia program. Kod znajduje się w `src/graph_dpo/`:

| Moduł | Za co odpowiada |
|---|---|
| `models.py` | Reprezentacja grafu, reguły, dopasowania i wyniku |
| `validation.py` | Odczyt struktury wejściowej i sprawdzanie dopasowania |
| `rewrite.py` | Warunek wiszącej krawędzi oraz konstrukcja grafów pośredniego i wynikowego |
| `exports.py` | Zapis JSON, CSV i Excela |
| `cli.py` | Argumenty polecenia, odczyt pliku i komunikaty |

## Sprawdzenie projektu

```sh
uv run python -m pytest -q
uv run ruff check .
```
