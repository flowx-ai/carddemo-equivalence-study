# Project Data Model — Ledgerline → FLOWX.AI

> **Powered by FLOWX.AI Coding Agents**

This section documents all **Project Data Types** derived from the Ledgerline copybooks (`/app/cpy`). Each VSAM record layout maps to a Project Data Type; COBOL `05`-level items become attributes. Packed/zoned/signed numerics (`COMP-3`, `S9(n)V99`) map to `NUMBER`, fixed-width `X(10)` dates map to `DATE`, and FILLER tails are dropped. Enumerated reference codes are documented in [Enumerations](enumerations.md).

> **Type-conversion note:** `S9(10)V99` → `NUMBER` (decimal, scale 2); `9(n)` → `NUMBER` (integer); `X(n)` → `STRING` (maxLength n); `X(10)` date → `DATE`; `X(26)` timestamp → `DATE` (timestamp). The `LACC-EXPIRY-DATE` legacy typo is corrected to `expirationDate` — see `{{DECISION}}` below.

---

## Business Categories

| Category | Types |
|----------|-------|
| **Core Processing** | [Account](#account), [Transaction](#transaction), [TransactionCategoryBalance](#transactioncategorybalance) |
| **Domain** | [Customer](#customer), [Card](#card), [CardXref](#cardlink) |
| **Reference / Config** | [TransactionType](#transactiontype), [TransactionCategory](#transactioncategory) |
| **Security** | [SecurityUser](#securityuser) |
| **Navigation (internal)** | [SessionContext](#sessioncontext) |

---

## Account

Replaces the ACCOUNT-RECORD VSAM KSDS (`LEDGFILE` / `LXV022Y`, 300 bytes). Key: `accountId`.

| Attribute | Type | Required | Constraints | Description | Legacy Source |
|-----------|------|----------|-------------|-------------|---------------|
| accountId | NUMBER | Yes | 11 digits, unique key | Account identifier | `LACC-ID 9(11)` |
| activeStatus | ENUM | Yes | [AccountStatus](enumerations.md#accountstatus) | Active status flag | `LACC-ACTIVE-STATUS X(1)` |
| currentBalance | NUMBER | Yes | decimal(12,2), signed | Current account balance | `LACC-CURR-BAL S9(10)V99` |
| creditLimit | NUMBER | Yes | decimal(12,2), signed | Credit limit | `LACC-CREDIT-LIMIT S9(10)V99` |
| cashCreditLimit | NUMBER | Yes | decimal(12,2), signed | Cash credit limit | `LACC-CASH-CREDIT-LIMIT S9(10)V99` |
| openDate | DATE | Yes | | Account open date | `LACC-OPEN-DATE X(10)` |
| expirationDate | DATE | Yes | | Account expiration date | `LACC-EXPIRY-DATE X(10)` *(legacy typo)* |
| reissueDate | DATE | No | | Account reissue date | `LACC-REISSUE-DATE X(10)` |
| currentCycleCredit | NUMBER | Yes | decimal(12,2), signed | Current-cycle credits | `LACC-CURR-CYC-CREDIT S9(10)V99` |
| currentCycleDebit | NUMBER | Yes | decimal(12,2), signed | Current-cycle debits | `LACC-CURR-CYC-DEBIT S9(10)V99` |
| addressZip | STRING | No | max 10 | Account ZIP code | `LACC-ADDR-ZIP X(10)` |
| groupId | STRING | No | max 10 | Disclosure/interest group id | `LACC-GROUP-ID X(10)` |

`{{DECISION: Correct the legacy field name typo LACC-EXPIRY-DATE → expirationDate (recommended), or preserve the misspelling for round-trip fidelity? ETL must map the legacy column either way.}}`

**Used by:** [Account View](../02-processes/process-account-view.md), [Account Update](../02-processes/process-account-update.md), [Bill Payment](../02-processes/process-bill-payment.md), [Transaction Posting](../02-processes/process-transaction-posting.md), [Interest Calculation](../02-processes/process-interest-calculation.md).

---

## Customer

Replaces CUSTOMER-RECORD (`CLNTFILE` / `LXV025Y`, 500 bytes). Key: `customerId`.

| Attribute | Type | Required | Constraints | Description | Legacy Source |
|-----------|------|----------|-------------|-------------|---------------|
| customerId | NUMBER | Yes | 9 digits, unique key | Customer identifier | `CLNT-ID 9(9)` |
| firstName | STRING | Yes | max 25 | First name | `CLNT-FIRST-NAME X(25)` |
| middleName | STRING | No | max 25 | Middle name | `CLNT-MIDDLE-NAME X(25)` |
| lastName | STRING | Yes | max 25 | Last name | `CLNT-LAST-NAME X(25)` |
| addressLine1 | STRING | Yes | max 50 | Address line 1 | `CLNT-ADDR-LINE-1 X(50)` |
| addressLine2 | STRING | No | max 50 | Address line 2 | `CLNT-ADDR-LINE-2 X(50)` |
| addressLine3 | STRING | No | max 50 | Address line 3 | `CLNT-ADDR-LINE-3 X(50)` |
| addressStateCode | STRING | No | max 2 | State code | `CLNT-ADDR-STATE-CD X(2)` |
| addressCountryCode | STRING | No | max 3 | Country code | `CLNT-ADDR-COUNTRY-CD X(3)` |
| addressZip | STRING | No | max 10 | ZIP code | `CLNT-ADDR-ZIP X(10)` |
| phoneNumber1 | STRING | No | max 15 | Primary phone | `CLNT-PHONE-NUM-1 X(15)` |
| phoneNumber2 | STRING | No | max 15 | Secondary phone | `CLNT-PHONE-NUM-2 X(15)` |
| ssn | NUMBER | Yes | 9 digits (PII) | Social security number | `CLNT-SSN 9(9)` |
| govtIssuedId | STRING | No | max 20 | Government-issued id | `CLNT-GOVT-ISSUED-ID X(20)` |
| dateOfBirth | DATE | No | | Date of birth | `CLNT-DOB-YYYY-MM-DD X(10)` |
| eftAccountId | STRING | No | max 10 | EFT account id | `CLNT-EFT-ACCOUNT-ID X(10)` |
| primaryCardHolderInd | STRING | No | max 1 | Primary-holder indicator | `CLNT-PRI-CRD-HOLDER-IND X(1)` |
| ficoCreditScore | NUMBER | No | 300–850 | FICO credit score | `CLNT-FICO-CREDIT-SCORE 9(3)` |

`{{TODO: SSN and govt id are PII — define masking/encryption and access restrictions in FLOWX.}}`

**Used by:** [Account View](../02-processes/process-account-view.md), [Account Update](../02-processes/process-account-update.md), [Authorization](../02-processes/process-authorization.md).

---

## Card

Replaces CRD-RECORD (`CRDFILE` + `CRDAIX` / `LXV023Y`, 150 bytes). Key: `cardNumber`; alternate index on `cardAccountId`.

| Attribute | Type | Required | Constraints | Description | Legacy Source |
|-----------|------|----------|-------------|-------------|---------------|
| cardNumber | STRING | Yes | 16 chars, unique key (PCI) | Card number | `CRD-NUM X(16)` |
| cardAccountId | NUMBER | Yes | 11 digits, AIX | Owning account id | `CRD-LACC-ID 9(11)` |
| cvvCode | NUMBER | Yes | 3 digits (PCI) | Card verification value | `CRD-CVV-CD 9(3)` |
| embossedName | STRING | Yes | max 50 | Name embossed on card | `CRD-EMBOSSED-NAME X(50)` |
| expirationDate | DATE | Yes | | Card expiration date | `CRD-EXPIRY-DATE X(10)` *(legacy typo)* |
| activeStatus | ENUM | Yes | [CardStatus](enumerations.md#cardstatus) | Card active status | `CRD-ACTIVE-STATUS X(1)` |

`{{TODO: cardNumber and cvvCode are PCI-sensitive — define tokenization/masking strategy.}}`

**Used by:** [Card List](../02-processes/process-card-list.md), [Card View](../02-processes/process-card-view.md), [Card Update](../02-processes/process-card-update.md), [Card Security](../02-processes/process-card-security.md), [Authorization](../02-processes/process-authorization.md).

---

## CardXref

Replaces CRD-LINK-RECORD (`LINKFILE` + `LKACAIX` / `LXV024Y`, 50 bytes). Links card ↔ customer ↔ account; alternate index on `accountId`.

| Attribute | Type | Required | Constraints | Description | Legacy Source |
|-----------|------|----------|-------------|-------------|---------------|
| cardNumber | STRING | Yes | 16 chars, key | Card number | `LINK-CRD-NUM X(16)` |
| customerId | NUMBER | Yes | 9 digits | Customer id | `LINK-CLNT-ID 9(9)` |
| accountId | NUMBER | Yes | 11 digits, AIX | Account id | `LINK-LACC-ID 9(11)` |

**Used by:** [Account View](../02-processes/process-account-view.md), [Card List](../02-processes/process-card-list.md), [Transaction Add](../02-processes/process-transaction-add.md), [Authorization](../02-processes/process-authorization.md).

---

## Transaction

Replaces TXN-RECORD (`TXNFILEX` / `LXV030Y`, 350 bytes). Key: `transactionId`.

| Attribute | Type | Required | Constraints | Description | Legacy Source |
|-----------|------|----------|-------------|-------------|---------------|
| transactionId | STRING | Yes | 16 chars, unique key | Transaction identifier | `TXN-ID X(16)` |
| typeCode | ENUM | Yes | [TransactionType](enumerations.md#transactiontype) | Transaction type code | `TXN-TYPE-CD X(2)` |
| categoryCode | ENUM | Yes | [TransactionCategory](enumerations.md#transactioncategory) | Transaction category code | `TXN-CAT-CD 9(4)` |
| source | STRING | No | max 10 | Transaction source | `TXN-SOURCE X(10)` |
| description | STRING | No | max 100 | Transaction description | `TXN-DESC X(100)` |
| amount | NUMBER | Yes | decimal(11,2), signed | Transaction amount | `TXN-AMT S9(9)V99` |
| merchantId | NUMBER | No | 9 digits | Merchant id | `TXN-MERCHANT-ID 9(9)` |
| merchantName | STRING | No | max 50 | Merchant name | `TXN-MERCHANT-NAME X(50)` |
| merchantCity | STRING | No | max 50 | Merchant city | `TXN-MERCHANT-CITY X(50)` |
| merchantZip | STRING | No | max 10 | Merchant ZIP | `TXN-MERCHANT-ZIP X(10)` |
| cardNumber | STRING | Yes | 16 chars | Card used | `TXN-CRD-NUM X(16)` |
| originTimestamp | DATE | No | timestamp | Origination timestamp | `TXN-ORIG-TS X(26)` |
| processTimestamp | DATE | No | timestamp | Processing timestamp | `TXN-PROC-TS X(26)` |

**Used by:** [Transaction List](../02-processes/process-transaction-list.md), [Transaction View](../02-processes/process-transaction-view.md), [Transaction Add](../02-processes/process-transaction-add.md), [Transaction Posting](../02-processes/process-transaction-posting.md), [Reports](../02-processes/process-reports.md).

---

## TransactionCategoryBalance

Replaces TXN-CAT-BAL-RECORD (`BALCATF` / `LXV026Y`, 50 bytes). Composite key: `accountId` + `typeCode` + `categoryCode`.

| Attribute | Type | Required | Constraints | Description | Legacy Source |
|-----------|------|----------|-------------|-------------|---------------|
| accountId | NUMBER | Yes | 11 digits, key part | Account id | `BCAT-LACC-ID 9(11)` |
| typeCode | ENUM | Yes | [TransactionType](enumerations.md#transactiontype), key part | Transaction type | `BCAT-TYPE-CD X(2)` |
| categoryCode | ENUM | Yes | [TransactionCategory](enumerations.md#transactioncategory), key part | Category | `BCAT-CD 9(4)` |
| balance | NUMBER | Yes | decimal(11,2), signed | Category running balance | `TXN-CAT-BAL S9(9)V99` |

**Used by:** [Transaction Posting](../02-processes/process-transaction-posting.md), [Interest Calculation](../02-processes/process-interest-calculation.md), [Reports](../02-processes/process-reports.md).

---

## SecurityUser

Replaces OPR-USER-DATA (`OPRSEC` / `LXS020Y`). Key: `userId`. Target FLOWX model gates access with roles; plaintext password is replaced by IdP credentials.

| Attribute | Type | Required | Constraints | Description | Legacy Source |
|-----------|------|----------|-------------|-------------|---------------|
| userId | STRING | Yes | 8 chars, unique key | User id | `OPR-OP-ID X(8)` |
| firstName | STRING | Yes | max 20 | First name | `OPR-OP-FNAME X(20)` |
| lastName | STRING | Yes | max 20 | Last name | `OPR-OP-LNAME X(20)` |
| password | STRING | — | **DO NOT MIGRATE** | Plaintext password (legacy debt) | `OPR-OP-PWD X(8)` |
| userType | ENUM | Yes | [UserType](enumerations.md#usertype) | Admin (`A`) / User (`U`) | `OPR-OP-TYPE X(1)` |

`{{DECISION: Do NOT migrate the plaintext password column. Provision users in a modern IdP and map userType → FLOWX roles. Confirm IdP (Keycloak/other).}}`

**Used by:** [Signon](../02-processes/process-signon.md), [User Administration](../02-processes/process-user-administration.md).

---

## SessionContext

Internal process data replacing the navigation portion of `LEDGERLINE-COMMAREA` (`LXO014Y`). Not persisted — lives in process instance data. Documented here for traceability; in FLOWX most of these become implicit process state.

| Attribute | Type | Description | Legacy Source |
|-----------|------|-------------|---------------|
| userId | STRING | Signed-on user id | `LLINE-USER-ID X(8)` |
| userType | ENUM | [UserType](enumerations.md#usertype) | `LLINE-USER-TYPE X(1)` (88 A/U) |
| selectedCustomerId | NUMBER | Current customer context | `LLINE-CLNT-ID 9(9)` |
| selectedAccountId | NUMBER | Current account context | `LLINE-LACC-ID 9(11)` |
| selectedCardNumber | STRING | Current card context | `LLINE-CRD-NUM 9(16)` |

`{{DECISION: The from/to tranid/program and last-map/mapset fields (LLINE-FROM-*, LLINE-TO-*, LLINE-LAST-MAP) are pure navigation plumbing — replace with FLOWX process transitions and do not model them as data. Confirm.}}`

See [Data Model Diagram](data-model-diagram.md) for relationships.

---
*Powered by **FLOWX.AI** Coding Agents*
