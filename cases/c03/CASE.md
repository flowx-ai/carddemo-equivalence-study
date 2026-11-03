# c03 — orphan cross-reference

Base sample data plus one CARDXREF row (card 8888888888888888 → customer 000000999, account 99999999999; neither exists) and one daily transaction on that card.

| Tran ID | Card | Amount | Orig date | Rule targeted | Expected |
|---|---|---|---|---|---|
| C03T000000000001 | 8888888888888888 | 10.00 | 2022-06-10 | card in CARDXREF, account missing | reject 101 |

Downstream (observed legacy behaviour): CREASTMT walks every CARDXREF row, fails to read customer 000000999 (status 23) and abends with RC 16 after writing 44 of the 50 statements (partial output: statements for cards that sort after 8888888888888888 are never produced). A migration has to reproduce, fix or flag this.
