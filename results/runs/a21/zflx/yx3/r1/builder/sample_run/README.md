Synthetic fixture only — NOT the CardDemo run inputs. Workflow run `6ae1f1143695c563ea50aedf` on dev-env.
Fixture: 4 xrefs (one with no customer/account → skippedCards), 2 accounts, 3 customers (FICO 623/711/793),
4 transactions (card 4111…: 105.00, 2.55 [overpunch E], -10.00 [overpunch }]; card 4222…: 12345.60; card 4333…: none).
Run summary: statementCount 3, transactionLineCount 4,
skippedCards "4999999999999999 customer 000000009 not found account 00000000009 not found".
The HTML output of the same run is in the workflow run record (get_workflow_run).
