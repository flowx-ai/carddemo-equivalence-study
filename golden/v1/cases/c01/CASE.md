# c01 — POSTTRAN validation coverage

Base sample data plus the records below (appended after the 300 base daily transactions). Reason 101 lives in c03, because its orphan CARDXREF row makes CREASTMT abend..
Headroom = credit limit − (cycle credit − cycle debit) after the base posting (golden/v1).

| Tran ID | Card | Amount | Orig date | Rule targeted | Expected |
|---|---|---|---|---|---|
| C01T000000000001 | 9999999999999999 | 10.00 | 2022-06-10 | card not in CARDXREF | reject 100 |
| C01T000000000003 | 5407099850479866 | 1.00 | 2030-01-01 | received after account expiry (00000000021 expires 2023-01-06) | reject 103 |
| C01T000000000004 | 5407099850479866 | 99999999.99 | 2030-01-01 | over limit AND after expiry: 103 overwrites 102 | reject 103 |
| C01T000000000005 | 5407099850479866 | 1.00 | 2023-01-06 | orig date == expiry date (>= passes) | posted |
| C01T000000000006 | 9680294154603697 | 784.36 | 2022-06-10 | amount == remaining headroom on 00000000001 (>= passes) | posted |
| C01T000000000007 | 0923877193247330 | 3027.04 | 2022-06-10 | amount == headroom + 0.01 on 00000000002 | reject 102 |
| C01T000000000008 | 3999169246375885 | -500.00 | 2022-06-10 | credit (negative amount) on 00000000003: goes to cycle debit | posted |
