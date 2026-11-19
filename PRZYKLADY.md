# Katalog przykładów DPO

Każdy przykład jest dostępny z listy w UI i jako plik JSON w `examples/`. Poniższe wyniki dotyczą dopasowania `match` zapisanego w pliku; w UI można wybrać inne. Liczymy osobne morfizmy L → G, więc symetria może dawać kilka dopasowań tego samego fragmentu. Etykiety są wyłącznie tekstem na rysunku.

L, K i R są niezależnymi grafami z jawnymi morfizmami l: K → L oraz r: K → R. K opisuje zachowywany fragment, usuwamy elementy L spoza l(K), a dodajemy elementy R spoza r(K). Id wynikowych elementów zachowanych pochodzą z G; id nowych elementów mogą dostać sufiks przy kolizji nazw.

Przykład `slide8` nawiązuje do materiałów „SPO I DPO”; `slide8_rejected` jest jego wariantem. Pozostałe przykłady są autorskimi scenariuszami testowymi.

Uruchomienie przykładu przez CLI: `uv run python dpo.py examples/<nazwa>.json --output-dir wynik/<nazwa>`. Kod wyjścia: `0` dla zastosowania, `3` dla odrzucenia, `1` dla błędu wejścia. Wyjątek `cycle_no_match` opisano osobno.

## [connect_components](examples/connect_components.json)

Dwa osobne cykle i rozłączny łańcuch. Reguła wybiera dwa różne wierzchołki i dodaje pomost przez `bridge`. Jest 90 dopasowań; zapisane dopasowanie łączy pierwszy i drugi cykl. Inne wybory mogą połączyć wierzchołki tej samej składowej.

- Graf G: węzły - 10; krawędzie - 9.
- Graf K: węzły - 2; krawędzie - 0. Krawędzie K: brak.
- Wyszukiwanie: dopasowania - 90; dozwolone - 90; zablokowane - 0.
- Zapisane odwzorowanie węzłów m: `x` → `C`, `y` → `D`.
- Obraz krawędzi K w G dla zapisanego m: brak.
- Usuwane węzły: brak. Usuwane krawędzie: brak.
- Nowe węzły: `bridge`. Nowe krawędzie: `bridge-in` (C → bridge), `bridge-out` (bridge → D).
- Wynik: zastosowanie (`applied`). D: węzły - 10, krawędzie - 9. H: węzły - 11, krawędzie - 11.

## [cycle_no_match](examples/cycle_no_match.json)

Rozgałęziony graf acykliczny i reguła szukająca skierowanego trójkąta. UI pokazuje zero dopasowań. Plik celowo nie zawiera `match`: nadaje się do wyszukiwania w UI, a CLI zgłasza brak dopasowania wejściowego (kod `1`).

- Graf G: węzły - 10; krawędzie - 11.
- Graf K: węzły - 3; krawędzie - 3. Krawędzie K: `xy` (x → y), `yz` (y → z), `zx` (z → x).
- Wyszukiwanie: dopasowania - 0; dozwolone - 0; zablokowane - 0.
- Plik nie ma zapisanego `match`. W UI pokazuje brak dopasowań; próba bezpośredniego zastosowania przez CLI zwraca kod `1`.

## [diamond_expand](examples/diamond_expand.json)

Dwa połączone „diamenty”, sprzężenie zwrotne i zewnętrzny monitor. Pierwszy diament zostaje rozbudowany do czterech nowych węzłów, a drugi i jego otoczenie pozostają zachowane. Są 4 morfizmy dopasowania: dwa wybory diamentu (A, B, C, D lub E, F, G, H) razy dwie zamiany symetrycznych ramion p i q. Dopasowania 1 i 2 wskazują ten sam fragment i dają ten sam wynik; analogicznie 3 i 4. Nie jest to mechanizm wildcardów.

- Graf G: węzły - 11; krawędzie - 13.
- Graf K: węzły - 2; krawędzie - 0. Krawędzie K: brak.
- Wyszukiwanie: dopasowania - 4; dozwolone - 4; zablokowane - 0.
- Zapisane odwzorowanie węzłów m: `s` → `A`, `p` → `B`, `q` → `C`, `t` → `D`.
- Obraz krawędzi K w G dla zapisanego m: brak.
- Usuwane węzły: `B`, `C`. Usuwane krawędzie: `ab` (A → B), `ac` (A → C), `bd` (B → D), `cd` (C → D).
- Nowe węzły: `split`, `upper`, `lower`, `merge`. Nowe krawędzie: `entry` (A → split), `upper-in` (split → upper), `lower-in` (split → lower), `upper-out` (upper → merge), `lower-out` (lower → merge), `exit` (merge → D).
- Wynik: zastosowanie (`applied`). D: węzły - 9, krawędzie - 9. H: węzły - 13, krawędzie - 15.

## [empty_interface_replace](examples/empty_interface_replace.json)

K jest pusty, chociaż w L i R występuje to samo id `x`. Węzeł G zostaje usunięty i powstaje nowy `x_1`; wspólne nazwy nie wyznaczają zachowania elementu.

- Graf G: węzły - 1; krawędzie - 0.
- Graf K: węzły - 0; krawędzie - 0. Krawędzie K: brak.
- Wyszukiwanie: dopasowania - 1; dozwolone - 1; zablokowane - 0.
- Zapisane odwzorowanie węzłów m: `x` → `x`.
- Obraz krawędzi K w G dla zapisanego m: brak.
- Usuwane węzły: `x`. Usuwane krawędzie: brak.
- Nowe węzły: `x_1`. Nowe krawędzie: brak.
- Wynik: zastosowanie (`applied`). D: węzły - 0, krawędzie - 0. H: węzły - 1, krawędzie - 0.

## [explicit_morphisms](examples/explicit_morphisms.json)

K ma własne id `k1`, `k2`, `ke`, a morfizmy łączą je z innymi id w L i R. Zachowana krawędź pozostaje w G mimo trzech różnych nazw w regule.

- Graf G: węzły - 3; krawędzie - 2.
- Graf K: węzły - 2; krawędzie - 1. Krawędzie K: `ke` (k1 → k2).
- Wyszukiwanie: dopasowania - 2; dozwolone - 2; zablokowane - 0.
- Zapisane odwzorowanie węzłów m: `left-a` → `A`, `left-b` → `B`.
- Obraz krawędzi K w G dla zapisanego m: `ab`.
- Usuwane węzły: brak. Usuwane krawędzie: brak.
- Nowe węzły: `new`. Nowe krawędzie: `added` (B → new).
- Wynik: zastosowanie (`applied`). D: węzły - 3, krawędzie - 2. H: węzły - 4, krawędzie - 3.

## [k_cycle_attachment](examples/k_cycle_attachment.json)

K zachowuje cały skierowany cykl A → B → C → A (3 krawędzie). Usuwana jest boczna gałąź B → Old, a dodawana ścieżka A → nowy → C. Są 2 dopasowania, z czego 1 jest dozwolone; zapisany `match` wybiera dozwolone.

- Graf G: węzły - 7; krawędzie - 7.
- Graf K: węzły - 3; krawędzie - 3. Krawędzie K: `k_ab` (k_a → k_b), `k_bc` (k_b → k_c), `k_ca` (k_c → k_a).
- Wyszukiwanie: dopasowania - 2; dozwolone - 1; zablokowane - 1.
- Zapisane odwzorowanie węzłów m: `l_a` → `A`, `l_b` → `B`, `l_c` → `C`, `l_old` → `Old`.
- Obraz krawędzi K w G dla zapisanego m: `ab`, `bc`, `ca`.
- Usuwane węzły: `Old`. Usuwane krawędzie: `b-old` (B → Old).
- Nowe węzły: `r_new`. Nowe krawędzie: `r_an` (A → r_new), `r_nc` (r_new → C).
- Wynik: zastosowanie (`applied`). D: węzły - 6, krawędzie - 6. H: węzły - 7, krawędzie - 8.

## [k_disconnected_bridge](examples/k_disconnected_bridge.json)

K składa się z dwóch rozłącznych krawędzi A → B i D → E. Reguła zachowuje obie i dodaje połączenie B → nowy → D. Jest 8 dopasowań, wszystkie dozwolone; zapisane dopasowanie łączy dwie różne składowe G.

- Graf G: węzły - 6; krawędzie - 4.
- Graf K: węzły - 4; krawędzie - 2. Krawędzie K: `k_ab` (k_a → k_b), `k_de` (k_d → k_e).
- Wyszukiwanie: dopasowania - 8; dozwolone - 8; zablokowane - 0.
- Zapisane odwzorowanie węzłów m: `l_a` → `A`, `l_b` → `B`, `l_d` → `D`, `l_e` → `E`.
- Obraz krawędzi K w G dla zapisanego m: `ab`, `de`.
- Usuwane węzły: brak. Usuwane krawędzie: brak.
- Nowe węzły: `r_new`. Nowe krawędzie: `r_bn` (B → r_new), `r_nd` (r_new → D).
- Wynik: zastosowanie (`applied`). D: węzły - 6, krawędzie - 4. H: węzły - 7, krawędzie - 6.

## [k_loop_preserved](examples/k_loop_preserved.json)

K zawiera pętlę A → A i krawędź A → B. Obie pozostają w grafie, a reguła dodaje odgałęzienie B → nowy i pętlę na nowym węźle. Jest dokładnie 1 dopasowanie.

- Graf G: węzły - 5; krawędzie - 5.
- Graf K: węzły - 2; krawędzie - 2. Krawędzie K: `k_aa` (k_a → k_a), `k_ab` (k_a → k_b).
- Wyszukiwanie: dopasowania - 1; dozwolone - 1; zablokowane - 0.
- Zapisane odwzorowanie węzłów m: `l_a` → `A`, `l_b` → `B`.
- Obraz krawędzi K w G dla zapisanego m: `loop-a`, `ab`.
- Usuwane węzły: brak. Usuwane krawędzie: brak.
- Nowe węzły: `r_new`. Nowe krawędzie: `r_bn` (B → r_new), `r_nn` (r_new → r_new).
- Wynik: zastosowanie (`applied`). D: węzły - 5, krawędzie - 5. H: węzły - 6, krawędzie - 7.

## [k_parallel_preserved](examples/k_parallel_preserved.json)

K zachowuje dwie równoległe krawędzie A → B. Trzecia krawędź zostaje zastąpiona ścieżką przez nowy węzeł. Jest 6 dopasowań: 3 wybory pierwszej krawędzi razy 2 wybory drugiej; pozostała krawędź jest usuwana.

- Graf G: węzły - 4; krawędzie - 5.
- Graf K: węzły - 2; krawędzie - 2. Krawędzie K: `k_p` (k_a → k_b), `k_q` (k_a → k_b).
- Wyszukiwanie: dopasowania - 6; dozwolone - 6; zablokowane - 0.
- Zapisane odwzorowanie węzłów m: `l_a` → `A`, `l_b` → `B`.
- Obraz krawędzi K w G dla zapisanego m: `p1`, `p2`.
- Usuwane węzły: brak. Usuwane krawędzie: `p3` (A → B).
- Nowe węzły: `r_new`. Nowe krawędzie: `r_an` (A → r_new), `r_nb` (r_new → B).
- Wynik: zastosowanie (`applied`). D: węzły - 4, krawędzie - 4. H: węzły - 5, krawędzie - 6.

## [k_path_branch](examples/k_path_branch.json)

K zachowuje ścieżkę A → B → C (2 krawędzie). Reguła usuwa boczną gałąź B → Old i wstawia ścieżkę B → nowy → C. Wyszukiwanie daje 4 dopasowania, z czego 2 można zastosować.

- Graf G: węzły - 7; krawędzie - 7.
- Graf K: węzły - 3; krawędzie - 2. Krawędzie K: `k_ab` (k_a → k_b), `k_bc` (k_b → k_c).
- Wyszukiwanie: dopasowania - 4; dozwolone - 2; zablokowane - 2.
- Zapisane odwzorowanie węzłów m: `l_a` → `A`, `l_b` → `B`, `l_c` → `C`, `l_old` → `Old`.
- Obraz krawędzi K w G dla zapisanego m: `ab`, `bc`.
- Usuwane węzły: `Old`. Usuwane krawędzie: `b-old` (B → Old).
- Nowe węzły: `r_new`. Nowe krawędzie: `r_bn` (B → r_new), `r_nc` (r_new → C).
- Wynik: zastosowanie (`applied`). D: węzły - 6, krawędzie - 6. H: węzły - 7, krawędzie - 8.

## [k_path_branch_rejected](examples/k_path_branch_rejected.json)

K nadal zawiera ścieżkę z 2 krawędziami, ale dodatkowa Old → Sink blokuje usunięcie Old. Zapisane dopasowanie jest odrzucone z `edge_id: "old-sink"`; żadne z 4 znalezionych dopasowań nie jest dozwolone.

- Graf G: węzły - 7; krawędzie - 8.
- Graf K: węzły - 3; krawędzie - 2. Krawędzie K: `k_ab` (k_a → k_b), `k_bc` (k_b → k_c).
- Wyszukiwanie: dopasowania - 4; dozwolone - 0; zablokowane - 4.
- Zapisane odwzorowanie węzłów m: `l_a` → `A`, `l_b` → `B`, `l_c` → `C`, `l_old` → `Old`.
- Obraz krawędzi K w G dla zapisanego m: `ab`, `bc`.
- Wynik zapisanego dopasowania: odrzucenie (`dangling_edge`), blokuje krawędź `old-sink`. Grafy D i H nie powstają.

## [loop_cleanup_network](examples/loop_cleanup_network.json)

Cykl i dalszy łańcuch z czterema pętlami, w tym dwiema równoległymi. Wybrana pętla na D zostaje zastąpiona odgałęzieniem do `marker`; pozostałe połączenia i pętle nie zmieniają się.

- Graf G: węzły - 8; krawędzie - 12.
- Graf K: węzły - 1; krawędzie - 0. Krawędzie K: brak.
- Wyszukiwanie: dopasowania - 4; dozwolone - 4; zablokowane - 0.
- Zapisane odwzorowanie węzłów m: `x` → `D`.
- Obraz krawędzi K w G dla zapisanego m: brak.
- Usuwane węzły: brak. Usuwane krawędzie: `loop-d` (D → D).
- Nowe węzły: `marker`. Nowe krawędzie: `mark` (D → marker).
- Wynik: zastosowanie (`applied`). D: węzły - 8, krawędzie - 11. H: węzły - 9, krawędzie - 12.

## [name_collisions](examples/name_collisions.json)

W grafie istnieją już `relay`, `relay_1`, `relay_2` oraz nazwy nowych krawędzi. Reguła dodaje więc `relay_3`, `to-relay_2` i `from-relay_1`, zachowując dotychczasowe elementy o kolidujących nazwach.

- Graf G: węzły - 8; krawędzie - 6.
- Graf K: węzły - 2; krawędzie - 0. Krawędzie K: brak.
- Wyszukiwanie: dopasowania - 6; dozwolone - 6; zablokowane - 0.
- Zapisane odwzorowanie węzłów m: `x` → `A`, `y` → `B`.
- Obraz krawędzi K w G dla zapisanego m: brak.
- Usuwane węzły: brak. Usuwane krawędzie: `ab` (A → B).
- Nowe węzły: `relay_3`. Nowe krawędzie: `to-relay_2` (A → relay_3), `from-relay_1` (relay_3 → B).
- Wynik: zastosowanie (`applied`). D: węzły - 8, krawędzie - 5. H: węzły - 9, krawędzie - 7.

## [parallel_bundle](examples/parallel_bundle.json)

Sieć z wiązkami dwóch i trzech równoległych krawędzi. Reguła zachowuje jedną krawędź w K, a drugą zastępuje ścieżką przez `relay`; trzecia pozostaje częścią kontekstu. Łącznie 8 dopasowań różniących się wyborem krawędzi.

- Graf G: węzły - 8; krawędzie - 11.
- Graf K: węzły - 2; krawędzie - 1. Krawędzie K: `keep` (x → y).
- Wyszukiwanie: dopasowania - 8; dozwolone - 8; zablokowane - 0.
- Zapisane odwzorowanie węzłów m: `x` → `A`, `y` → `B`.
- Obraz krawędzi K w G dla zapisanego m: `ab-1`.
- Usuwane węzły: brak. Usuwane krawędzie: `ab-2` (A → B).
- Nowe węzły: `relay`. Nowe krawędzie: `to-relay` (A → relay), `from-relay` (relay → B).
- Wynik: zastosowanie (`applied`). D: węzły - 8, krawędzie - 10. H: węzły - 9, krawędzie - 12.

## [parallel_edges](examples/parallel_edges.json)

Dwie równoległe krawędzie A → B dają dwa dopasowania. Wybrana krawędź zostaje odwrócona, druga pozostaje.

- Graf G: węzły - 2; krawędzie - 2.
- Graf K: węzły - 2; krawędzie - 0. Krawędzie K: brak.
- Wyszukiwanie: dopasowania - 2; dozwolone - 2; zablokowane - 0.
- Zapisane odwzorowanie węzłów m: `x` → `A`, `y` → `B`.
- Obraz krawędzi K w G dla zapisanego m: brak.
- Usuwane węzły: brak. Usuwane krawędzie: `ab1` (A → B).
- Nowe węzły: brak. Nowe krawędzie: `yx` (B → A).
- Wynik: zastosowanie (`applied`). D: węzły - 2, krawędzie - 1. H: węzły - 2, krawędzie - 2.

## [pipeline_bypass](examples/pipeline_bypass.json)

Sieć z 10 wierzchołkami, monitorem, archiwum i pętlą. Usunięcie B zastępuje A → B → C połączeniem A → C. Spośród 8 dopasowań 6 jest dozwolonych; dodatkowe połączenia mogą zablokować usunięcie innego węzła.

- Graf G: węzły - 10; krawędzie - 10.
- Graf K: węzły - 2; krawędzie - 0. Krawędzie K: brak.
- Wyszukiwanie: dopasowania - 8; dozwolone - 6; zablokowane - 2.
- Zapisane odwzorowanie węzłów m: `x` → `A`, `middle` → `B`, `y` → `C`.
- Obraz krawędzi K w G dla zapisanego m: brak.
- Usuwane węzły: `B`. Usuwane krawędzie: `ab` (A → B), `bc` (B → C).
- Nowe węzły: brak. Nowe krawędzie: `bypass` (A → C).
- Wynik: zastosowanie (`applied`). D: węzły - 9, krawędzie - 8. H: węzły - 9, krawędzie - 9.

## [pipeline_bypass_rejected](examples/pipeline_bypass_rejected.json)

Dodatkowa krawędź `monitor-b` blokuje zapisane usunięcie B. W całej sieci jest 9 dopasowań, z czego 5 można zastosować.

- Graf G: węzły - 10; krawędzie - 11.
- Graf K: węzły - 2; krawędzie - 0. Krawędzie K: brak.
- Wyszukiwanie: dopasowania - 9; dozwolone - 5; zablokowane - 4.
- Zapisane odwzorowanie węzłów m: `x` → `A`, `middle` → `B`, `y` → `C`.
- Obraz krawędzi K w G dla zapisanego m: brak.
- Wynik zapisanego dopasowania: odrzucenie (`dangling_edge`), blokuje krawędź `monitor-b`. Grafy D i H nie powstają.

## [remove_leaf](examples/remove_leaf.json)

Usuwa końcowy wierzchołek C wraz z B → C; warunek wiszącej krawędzi jest spełniony.

- Graf G: węzły - 3; krawędzie - 2.
- Graf K: węzły - 1; krawędzie - 0. Krawędzie K: brak.
- Wyszukiwanie: dopasowania - 2; dozwolone - 1; zablokowane - 1.
- Zapisane odwzorowanie węzłów m: `x` → `B`, `y` → `C`.
- Obraz krawędzi K w G dla zapisanego m: brak.
- Usuwane węzły: `C`. Usuwane krawędzie: `bc` (B → C).
- Nowe węzły: brak. Nowe krawędzie: brak.
- Wynik: zastosowanie (`applied`). D: węzły - 2, krawędzie - 1. H: węzły - 2, krawędzie - 1.

## [remove_loop](examples/remove_loop.json)

Usuwa pętlę A → A, zachowując A oraz krawędź A → B.

- Graf G: węzły - 2; krawędzie - 2.
- Graf K: węzły - 1; krawędzie - 0. Krawędzie K: brak.
- Wyszukiwanie: dopasowania - 1; dozwolone - 1; zablokowane - 0.
- Zapisane odwzorowanie węzłów m: `x` → `A`.
- Obraz krawędzi K w G dla zapisanego m: brak.
- Usuwane węzły: brak. Usuwane krawędzie: `aa` (A → A).
- Nowe węzły: brak. Nowe krawędzie: brak.
- Wynik: zastosowanie (`applied`). D: węzły - 2, krawędzie - 1. H: węzły - 2, krawędzie - 1.

## [remove_vertex_rejected](examples/remove_vertex_rejected.json)

Próba usunięcia B wraz z A → B jest odrzucona przez pozostającą B → C (`bc`). Wybór drugiego dopasowania pozwala zamiast tego usunąć C.

- Graf G: węzły - 3; krawędzie - 2.
- Graf K: węzły - 1; krawędzie - 0. Krawędzie K: brak.
- Wyszukiwanie: dopasowania - 2; dozwolone - 1; zablokowane - 1.
- Zapisane odwzorowanie węzłów m: `x` → `A`, `y` → `B`.
- Obraz krawędzi K w G dla zapisanego m: brak.
- Wynik zapisanego dopasowania: odrzucenie (`dangling_edge`), blokuje krawędź `bc`. Grafy D i H nie powstają.

## [repeated_labels](examples/repeated_labels.json)

Różne węzły mają identyczne etykiety A lub B. Zapisane dopasowanie dotyczy `a1` i `b1`, a nowy węzeł również ma etykietę A. Etykiety w L różnią się od etykiet w G, co nie blokuje dopasowania strukturalnego.

- Graf G: węzły - 6; krawędzie - 6.
- Graf K: węzły - 2; krawędzie - 0. Krawędzie K: brak.
- Wyszukiwanie: dopasowania - 6; dozwolone - 6; zablokowane - 0.
- Zapisane odwzorowanie węzłów m: `x` → `a1`, `y` → `b1`.
- Obraz krawędzi K w G dla zapisanego m: brak.
- Usuwane węzły: brak. Usuwane krawędzie: `ab1` (a1 → b1).
- Nowe węzły: `relay`. Nowe krawędzie: `xr` (a1 → relay), `ry` (relay → b1).
- Wynik: zastosowanie (`applied`). D: węzły - 6, krawędzie - 5. H: węzły - 7, krawędzie - 7.

## [reverse_edge](examples/reverse_edge.json)

Usuwa A → B i dodaje B → A bez usuwania wierzchołków.

- Graf G: węzły - 3; krawędzie - 2.
- Graf K: węzły - 2; krawędzie - 0. Krawędzie K: brak.
- Wyszukiwanie: dopasowania - 2; dozwolone - 2; zablokowane - 0.
- Zapisane odwzorowanie węzłów m: `x` → `A`, `y` → `B`.
- Obraz krawędzi K w G dla zapisanego m: brak.
- Usuwane węzły: brak. Usuwane krawędzie: `ab` (A → B).
- Nowe węzły: brak. Nowe krawędzie: `yx` (B → A).
- Wynik: zastosowanie (`applied`). D: węzły - 3, krawędzie - 1. H: węzły - 3, krawędzie - 2.

## [slide8](examples/slide8.json)

Większy przykład z materiałów: usuwanie fragmentu grafu i dodawanie nowych wierzchołków oraz krawędzi.

- Graf G: węzły - 7; krawędzie - 8.
- Graf K: węzły - 2; krawędzie - 0. Krawędzie K: brak.
- Wyszukiwanie: dopasowania - 1; dozwolone - 1; zablokowane - 0.
- Zapisane odwzorowanie węzłów m: `D` → `D`, `E` → `E`, `F` → `F`.
- Obraz krawędzi K w G dla zapisanego m: brak.
- Usuwane węzły: `E`. Usuwane krawędzie: `D-E` (D → E), `D-F` (D → F), `F-E` (F → E).
- Nowe węzły: `M`, `N`. Nowe krawędzie: `D-N` (D → N), `F-N` (F → N), `N-M` (N → M), `M-D` (M → D), `M-F` (M → F).
- Wynik: zastosowanie (`applied`). D: węzły - 6, krawędzie - 5. H: węzły - 8, krawędzie - 10.

## [slide8_rejected](examples/slide8_rejected.json)

Wariant poprzedniego przykładu, w którym dodatkowa krawędź E → C blokuje zapisane dopasowanie.

- Graf G: węzły - 7; krawędzie - 9.
- Graf K: węzły - 2; krawędzie - 0. Krawędzie K: brak.
- Wyszukiwanie: dopasowania - 2; dozwolone - 1; zablokowane - 1.
- Zapisane odwzorowanie węzłów m: `D` → `D`, `E` → `E`, `F` → `F`.
- Obraz krawędzi K w G dla zapisanego m: brak.
- Wynik zapisanego dopasowania: odrzucenie (`dangling_edge`), blokuje krawędź `E-C`. Grafy D i H nie powstają.

## [subdivide_edge](examples/subdivide_edge.json)

Zastępuje A → B ścieżką A → m → B; zachowuje końce krawędzi i pozostałą część grafu.

- Graf G: węzły - 3; krawędzie - 2.
- Graf K: węzły - 2; krawędzie - 0. Krawędzie K: brak.
- Wyszukiwanie: dopasowania - 2; dozwolone - 2; zablokowane - 0.
- Zapisane odwzorowanie węzłów m: `x` → `A`, `y` → `B`.
- Obraz krawędzi K w G dla zapisanego m: brak.
- Usuwane węzły: brak. Usuwane krawędzie: `ab` (A → B).
- Nowe węzły: `m`. Nowe krawędzie: `xm` (A → m), `my` (m → B).
- Wynik: zastosowanie (`applied`). D: węzły - 3, krawędzie - 1. H: węzły - 4, krawędzie - 3.
