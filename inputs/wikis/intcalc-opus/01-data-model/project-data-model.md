# Project Data Model — AWS CardDemo → FLOWX.AI

> **Powered by FLOWX.AI Coding Agents**

This section documents all **Project Data Types** derived from the CardDemo copybooks (`/app/cpy`). Each VSAM record layout maps to a Project Data Type; COBOL `05`-level items become attributes. Packed/zoned/signed numerics (`COMP-3`, `S9(n)V99`) map to `NUMBER`, fixed-width `X(10)` dates map to `DATE`, and FILLER tails are dropped. Enumerated reference codes are documented in [Enumerations](enumerations.md).

> **Type-conversion note:** `S9(10)V99` → `NUMBER` (decimal, scale 2); `9(n)` → `NUMBER` (integer); `X(n)` → `STRING` (maxLength n); `X(10)` date → `DATE`; `X(26)` timestamp → `DATE` (timestamp). The `ACCT-EXPIRAION-DATE` legacy typo is corrected to `expirationDate` — see `{{DECISION}}` below.

---

## Business Categories

| Category | Types |
|----------|-------|
| **Core Processing** | [Account](#account), [Transaction](#transaction), [TransactionCategoryBalance](#transactioncategorybalance) |
| **Domain** | [Customer](#customer), [Card](#card), [CardXref](#cardxref) |
| **Reference / Config** | [TransactionType](#transactiontype), [TransactionCategory](#transactioncategory) |
| **Security** | [SecurityUser](#securityuser) |
| **Navigation (internal)** | [SessionContext](#sessioncontext) |

---

## Account

Replaces the ACCOUNT-RECORD VSAM KSDS (`ACCTFILE` / `CVACT01Y`, 300 bytes). Key: `accountId`.

| Attribute | Type | Required | Constraints | Description | Legacy Source |
|-----------|------|----------|-------------|-------------|---------------|
| accountId | NUMBER | Yes | 11 digits, unique key | Account identifier | `ACCT-ID 9(11)` |
| activeStatus | ENUM | Yes | [AccountStatus](enumerations.md#accountstatus) | Active status flag | `ACCT-ACTIVE-STATUS X(1)` |
| currentBalance | NUMBER | Yes | decimal(12,2), signed | Current account balance | `ACCT-CURR-BAL S9(10)V99` |
| creditLimit | NUMBER | Yes | decimal(12,2), signed | Credit limit | `ACCT-CREDIT-LIMIT S9(10)V99` |
| cashCreditLimit | NUMBER | Yes | decimal(12,2), signed | Cash credit limit | `ACCT-CASH-CREDIT-LIMIT S9(10)V99` |
| openDate | DATE | Yes | | Account open date | `ACCT-OPEN-DATE X(10)` |
| expirationDate | DATE | Yes | | Account expiration date | `ACCT-EXPIRAION-DATE X(10)` *(legacy typo)* |
| reissueDate | DATE | No | | Account reissue date | `ACCT-REISSUE-DATE X(10)` |
| currentCycleCredit | NUMBER | Yes | decimal(12,2), signed | Current-cycle credits | `ACCT-CURR-CYC-CREDIT S9(10)V99` |
| currentCycleDebit | NUMBER | Yes | decimal(12,2), signed | Current-cycle debits | `ACCT-CURR-CYC-DEBIT S9(10)V99` |
| addressZip | STRING | No | max 10 | Account ZIP code | `ACCT-ADDR-ZIP X(10)` |
| groupId | STRING | No | max 10 | Disclosure/interest group id | `ACCT-GROUP-ID X(10)` |

`{{DECISION: Correct the legacy field name typo ACCT-EXPIRAION-DATE → expirationDate (recommended), or preserve the misspelling for round-trip fidelity? ETL must map the legacy column either way.}}`

**Used by:** [Account View](../02-processes/process-account-view.md), [Account Update](../02-processes/process-account-update.md), [Bill Payment](../02-processes/process-bill-payment.md), [Transaction Posting](../02-processes/process-transaction-posting.md), [Interest Calculation](../02-processes/process-interest-calculation.md).

---

## Customer

Replaces CUSTOMER-RECORD (`CUSTFILE` / `CVCUS01Y`, 500 bytes). Key: `customerId`.

| Attribute | Type | Required | Constraints | Description | Legacy Source |
|-----------|------|----------|-------------|-------------|---------------|
| customerId | NUMBER | Yes | 9 digits, unique key | Customer identifier | `CUST-ID 9(9)` |
| firstName | STRING | Yes | max 25 | First name | `CUST-FIRST-NAME X(25)` |
| middleName | STRING | No | max 25 | Middle name | `CUST-MIDDLE-NAME X(25)` |
| lastName | STRING | Yes | max 25 | Last name | `CUST-LAST-NAME X(25)` |
| addressLine1 | STRING | Yes | max 50 | Address line 1 | `CUST-ADDR-LINE-1 X(50)` |
| addressLine2 | STRING | No | max 50 | Address line 2 | `CUST-ADDR-LINE-2 X(50)` |
| addressLine3 | STRING | No | max 50 | Address line 3 | `CUST-ADDR-LINE-3 X(50)` |
| addressStateCode | STRING | No | max 2 | State code | `CUST-ADDR-STATE-CD X(2)` |
| addressCountryCode | STRING | No | max 3 | Country code | `CUST-ADDR-COUNTRY-CD X(3)` |
| addressZip | STRING | No | max 10 | ZIP code | `CUST-ADDR-ZIP X(10)` |
| phoneNumber1 | STRING | No | max 15 | Primary phone | `CUST-PHONE-NUM-1 X(15)` |
| phoneNumber2 | STRING | No | max 15 | Secondary phone | `CUST-PHONE-NUM-2 X(15)` |
| ssn | NUMBER | Yes | 9 digits (PII) | Social security number | `CUST-SSN 9(9)` |
| govtIssuedId | STRING | No | max 20 | Government-issued id | `CUST-GOVT-ISSUED-ID X(20)` |
| dateOfBirth | DATE | No | | Date of birth | `CUST-DOB-YYYY-MM-DD X(10)` |
| eftAccountId | STRING | No | max 10 | EFT account id | `CUST-EFT-ACCOUNT-ID X(10)` |
| primaryCardHolderInd | STRING | No | max 1 | Primary-holder indicator | `CUST-PRI-CARD-HOLDER-IND X(1)` |
| ficoCreditScore | NUMBER | No | 300–850 | FICO credit score | `CUST-FICO-CREDIT-SCORE 9(3)` |

`{{TODO: SSN and govt id are PII — define masking/encryption and access restrictions in FLOWX.}}`

**Used by:** [Account View](../02-processes/process-account-view.md), [Account Update](../02-processes/process-account-update.md), [Authorization](../02-processes/process-authorization.md).

---

## Card

Replaces CARD-RECORD (`CARDFILE` + `CARDAIX` / `CVACT02Y`, 150 bytes). Key: `cardNumber`; alternate index on `cardAccountId`.

| Attribute | Type | Required | Constraints | Description | Legacy Source |
|-----------|------|----------|-------------|-------------|---------------|
| cardNumber | STRING | Yes | 16 chars, unique key (PCI) | Card number | `CARD-NUM X(16)` |
| cardAccountId | NUMBER | Yes | 11 digits, AIX | Owning account id | `CARD-ACCT-ID 9(11)` |
| cvvCode | NUMBER | Yes | 3 digits (PCI) | Card verification value | `CARD-CVV-CD 9(3)` |
| embossedName | STRING | Yes | max 50 | Name embossed on card | `CARD-EMBOSSED-NAME X(50)` |
| expirationDate | DATE | Yes | | Card expiration date | `CARD-EXPIRAION-DATE X(10)` *(legacy typo)* |
| activeStatus | ENUM | Yes | [CardStatus](enumerations.md#cardstatus) | Card active status | `CARD-ACTIVE-STATUS X(1)` |

`{{TODO: cardNumber and cvvCode are PCI-sensitive — define tokenization/masking strategy.}}`

**Used by:** [Card List](../02-processes/process-card-list.md), [Card View](../02-processes/process-card-view.md), [Card Update](../02-processes/process-card-update.md), [Card Security](../02-processes/process-card-security.md), [Authorization](../02-processes/process-authorization.md).

---

## CardXref

Replaces CARD-XREF-RECORD (`XREFFILE` + `CXACAIX` / `CVACT03Y`, 50 bytes). Links card ↔ customer ↔ account; alternate index on `accountId`.

| Attribute | Type | Required | Constraints | Description | Legacy Source |
|-----------|------|----------|-------------|-------------|---------------|
| cardNumber | STRING | Yes | 16 chars, key | Card number | `XREF-CARD-NUM X(16)` |
| customerId | NUMBER | Yes | 9 digits | Customer id | `XREF-CUST-ID 9(9)` |
| accountId | NUMBER | Yes | 11 digits, AIX | Account id | `XREF-ACCT-ID 9(11)` |

**Used by:** [Account View](../02-processes/process-account-view.md), [Card List](../02-processes/process-card-list.md), [Transaction Add](../02-processes/process-transaction-add.md), [Authorization](../02-processes/process-authorization.md).

---

## Transaction

Replaces TRAN-RECORD (`TRANFILE` / `CVTRA05Y`, 350 bytes). Key: `transactionId`.

| Attribute | Type | Required | Constraints | Description | Legacy Source |
|-----------|------|----------|-------------|-------------|---------------|
| transactionId | STRING | Yes | 16 chars, unique key | Transaction identifier | `TRAN-ID X(16)` |
| typeCode | ENUM | Yes | [TransactionType](enumerations.md#transactiontype) | Transaction type code | `TRAN-TYPE-CD X(2)` |
| categoryCode | ENUM | Yes | [TransactionCategory](enumerations.md#transactioncategory) | Transaction category code | `TRAN-CAT-CD 9(4)` |
| source | STRING | No | max 10 | Transaction source | `TRAN-SOURCE X(10)` |
| description | STRING | No | max 100 | Transaction description | `TRAN-DESC X(100)` |
| amount | NUMBER | Yes | decimal(11,2), signed | Transaction amount | `TRAN-AMT S9(9)V99` |
| merchantId | NUMBER | No | 9 digits | Merchant id | `TRAN-MERCHANT-ID 9(9)` |
| merchantName | STRING | No | max 50 | Merchant name | `TRAN-MERCHANT-NAME X(50)` |
| merchantCity | STRING | No | max 50 | Merchant city | `TRAN-MERCHANT-CITY X(50)` |
| merchantZip | STRING | No | max 10 | Merchant ZIP | `TRAN-MERCHANT-ZIP X(10)` |
| cardNumber | STRING | Yes | 16 chars | Card used | `TRAN-CARD-NUM X(16)` |
| originTimestamp | DATE | No | timestamp | Origination timestamp | `TRAN-ORIG-TS X(26)` |
| processTimestamp | DATE | No | timestamp | Processing timestamp | `TRAN-PROC-TS X(26)` |

**Used by:** [Transaction List](../02-processes/process-transaction-list.md), [Transaction View](../02-processes/process-transaction-view.md), [Transaction Add](../02-processes/process-transaction-add.md), [Transaction Posting](../02-processes/process-transaction-posting.md), [Reports](../02-processes/process-reports.md).

---

## TransactionCategoryBalance

Replaces TRAN-CAT-BAL-RECORD (`TCATBALF` / `CVTRA01Y`, 50 bytes). Composite key: `accountId` + `typeCode` + `categoryCode`.

| Attribute | Type | Required | Constraints | Description | Legacy Source |
|-----------|------|----------|-------------|-------------|---------------|
| accountId | NUMBER | Yes | 11 digits, key part | Account id | `TRANCAT-ACCT-ID 9(11)` |
| typeCode | ENUM | Yes | [TransactionType](enumerations.md#transactiontype), key part | Transaction type | `TRANCAT-TYPE-CD X(2)` |
| categoryCode | ENUM | Yes | [TransactionCategory](enumerations.md#transactioncategory), key part | Category | `TRANCAT-CD 9(4)` |
| balance | NUMBER | Yes | decimal(11,2), signed | Category running balance | `TRAN-CAT-BAL S9(9)V99` |

**Used by:** [Transaction Posting](../02-processes/process-transaction-posting.md), [Interest Calculation](../02-processes/process-interest-calculation.md), [Reports](../02-processes/process-reports.md).

---

## SecurityUser

Replaces SEC-USER-DATA (`USRSEC` / `CSUSR01Y`). Key: `userId`. Target FLOWX model gates access with roles; plaintext password is replaced by IdP credentials.

| Attribute | Type | Required | Constraints | Description | Legacy Source |
|-----------|------|----------|-------------|-------------|---------------|
| userId | STRING | Yes | 8 chars, unique key | User id | `SEC-USR-ID X(8)` |
| firstName | STRING | Yes | max 20 | First name | `SEC-USR-FNAME X(20)` |
| lastName | STRING | Yes | max 20 | Last name | `SEC-USR-LNAME X(20)` |
| password | STRING | — | **DO NOT MIGRATE** | Plaintext password (legacy debt) | `SEC-USR-PWD X(8)` |
| userType | ENUM | Yes | [UserType](enumerations.md#usertype) | Admin (`A`) / User (`U`) | `SEC-USR-TYPE X(1)` |

`{{DECISION: Do NOT migrate the plaintext password column. Provision users in a modern IdP and map userType → FLOWX roles. Confirm IdP (Keycloak/other).}}`

**Used by:** [Signon](../02-processes/process-signon.md), [User Administration](../02-processes/process-user-administration.md).

---

## SessionContext

Internal process data replacing the navigation portion of `CARDDEMO-COMMAREA` (`COCOM01Y`). Not persisted — lives in process instance data. Documented here for traceability; in FLOWX most of these become implicit process state.

| Attribute | Type | Description | Legacy Source |
|-----------|------|-------------|---------------|
| userId | STRING | Signed-on user id | `CDEMO-USER-ID X(8)` |
| userType | ENUM | [UserType](enumerations.md#usertype) | `CDEMO-USER-TYPE X(1)` (88 A/U) |
| selectedCustomerId | NUMBER | Current customer context | `CDEMO-CUST-ID 9(9)` |
| selectedAccountId | NUMBER | Current account context | `CDEMO-ACCT-ID 9(11)` |
| selectedCardNumber | STRING | Current card context | `CDEMO-CARD-NUM 9(16)` |

`{{DECISION: The from/to tranid/program and last-map/mapset fields (CDEMO-FROM-*, CDEMO-TO-*, CDEMO-LAST-MAP) are pure navigation plumbing — replace with FLOWX process transitions and do not model them as data. Confirm.}}`

See [Data Model Diagram](data-model-diagram.md) for relationships.

---
*Powered by **FLOWX.AI** Coding Agents*
