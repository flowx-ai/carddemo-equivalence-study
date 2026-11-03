# Project Data Model

This page defines every **Project Data Type** of the Ledgerline FlowX application, derived from the legacy VSAM record layouts (`/app/cpy/*.cpy`), the optional-module IMS segments (`CIPAUSMY`, `CIPAUDTY`) and the DB2 DDL (`AUTHFRD`, `TRANSACTION_TYPE`, `TRANSACTION_TYPE_CATEGORY`). The legacy-to-FlowX mapping is in the [Transformation Matrix](../12-legacy-analysis/transformation-matrix.md).

> All legacy VSAM / IMS / DB2 stores are replaced by **FlowX Persistence (App Data Store)**. Access always goes through an [Integration Workflow](../04-integrations/integration-inventory.md) (DATA_SOURCE node on the `ledgerline-datastore` NOSQL_DB System).
> {{DECISION: Keep one NOSQL_DB System (`ledgerline-datastore`) with one collection per Project Data Type, instead of separate systems per legacy store (VSAM / IMS / DB2).}}

## Data Type Index

| ID | Project Data Type | Legacy Source | Legacy Store / Record Size | Collection |
|----|-------------------|---------------|----------------------------|------------|
| DT-01 | Account | `LXV022Y` | VSAM KSDS LEDGACC / 300 | `accounts` |
| DT-02 | Customer | `LXV025Y` | VSAM KSDS CLNTDAT / 500 | `customers` |
| DT-03 | Card | `LXV023Y` | VSAM KSDS CRDDAT (+AIX CRDAIX) / 150 | `cards` |
| DT-04 | CardXref | `LXV024Y` | VSAM KSDS CCLINK (+AIX LKACAIX) / 50 | `card_xrefs` |
| DT-05 | Transaction | `LXV030Y` | VSAM KSDS TXNFILE / 350 | `transactions` |
| DT-06 | TransactionCategoryBalance | `LXV026Y` | VSAM KSDS BALCATF / 50 | `tran_cat_balances` |
| DT-07 | DisclosureGroup | `LXV027Y` | VSAM KSDS RATEGRP / 50 | `disclosure_groups` |
| DT-08 | TransactionType | `LXV028Y`, DB2 `TRANSACTION_TYPE` | VSAM TXNTYPE / 60, DB2 | `transaction_types` |
| DT-09 | TransactionCategory | `LXV029Y`, DB2 `TRANSACTION_TYPE_CATEGORY` | VSAM TXNCATG / 60, DB2 | `transaction_categories` |
| DT-10 | UserAccount | `LXS020Y` | VSAM KSDS OPRSEC / 80 | `user_accounts` |
| DT-11 | DailyTransaction | `LXV031Y` | Sequential DAYTXN / 350 | `daily_transactions` |
| DT-12 | RejectedTransaction | `LXB007C` (DAYREJ) | Sequential / 430 | `rejected_transactions` |
| DT-13 | PendingAuthSummary | `CIPAUSMY` (IMS root) | IMS LXZ0350 | `pending_auth_summaries` |
| DT-14 | PendingAuthDetail | `CIPAUDTY` (IMS child) | IMS LXZ0341 | `pending_auth_details` |
| DT-15 | AuthFraudRecord | DB2 `LEDGERLINE.AUTHFRD` | DB2 table | `auth_fraud_records` |
| DT-16 | SessionContext | `LXO014Y` (COMMAREA) | CICS COMMAREA | process data (`session`) |
| DT-17 | StatementData | `LXB005A/B` (in-memory) | Working storage + STMTDS/HTMLDS | `statements` |
| DT-18 | BranchExportRecord | `CVEXPORT` / `CBEXPORT` | Sequential EXPFILE | `export_records` |
| DT-19 | OptionalModuleToggles | CICS `INQUIRE PROGRAM` check (LXO015C) | None | FeatureToggle Data Type |

---

## DT-01 Account

Legacy source: `/app/cpy/LXV022Y.cpy` (300 bytes). Primary key `accountId`.

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| accountId | String(11) numeric | Yes | `LACC-ID` 9(11) | Account number, non-zero |
| activeStatus | Enumeration `AccountActiveStatus` | Yes | `LACC-ACTIVE-STATUS` X(1) | Y / N |
| currentBalance | Number (2 dec) | Yes | `LACC-CURR-BAL` S9(10)V99 | Current balance |
| creditLimit | Number (2 dec) | Yes | `LACC-CREDIT-LIMIT` S9(10)V99 | Credit limit |
| cashCreditLimit | Number (2 dec) | Yes | `LACC-CASH-CREDIT-LIMIT` S9(10)V99 | Cash credit limit |
| openDate | Date (YYYY-MM-DD) | Yes | `LACC-OPEN-DATE` X(10) | Account open date |
| expiryDate | Date | Yes | `LACC-EXPIRY-DATE` X(10) (legacy typo) | Account expiry date |
| reissueDate | Date | No | `LACC-REISSUE-DATE` X(10) | Reissue date |
| currentCycleCredit | Number (2 dec) | Yes | `LACC-CURR-CYC-CREDIT` S9(10)V99 | Credits in current cycle |
| currentCycleDebit | Number (2 dec) | Yes | `LACC-CURR-CYC-DEBIT` S9(10)V99 | Debits in current cycle |
| addressZip | String(10) | No | `LACC-ADDR-ZIP` X(10) | Billing ZIP |
| groupId | String(10) | Yes | `LACC-GROUP-ID` X(10) | Disclosure Group id (A000000000 / STANDARD / ZEROAPR) |

Legacy FILLER (178 bytes) is dropped. Misspelling `EXPIRY` is corrected (see [Feature Improvements](../11-implementation-plan/feature-improvements.md)).

## DT-02 Customer

Legacy source: `/app/cpy/LXV025Y.cpy` (500 bytes). Primary key `customerId`.

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| customerId | String(9) numeric | Yes | `CLNT-ID` 9(9) | Customer id |
| firstName | String(25) | Yes | `CLNT-FIRST-NAME` X(25) | Alphabetic + spaces only |
| middleName | String(25) | No | `CLNT-MIDDLE-NAME` X(25) | |
| lastName | String(25) | Yes | `CLNT-LAST-NAME` X(25) | |
| addressLine1..3 | String(50) | Line 1,2: Yes | `CLNT-ADDR-LINE-1..3` X(50) | Street, line 2, city/other |
| addressState | String(2) | Yes | `CLNT-ADDR-STATE-CD` X(2) | US state code |
| addressCountry | String(3) | Yes | `CLNT-ADDR-COUNTRY-CD` X(3) | Country code |
| addressZip | String(10) | Yes | `CLNT-ADDR-ZIP` X(10) | |
| phone1, phone2 | String(15) | Phone1: Yes | `CLNT-PHONE-NUM-1/2` X(15) | Format (AAA)BBB-CCCC |
| ssn | String(9) numeric (**sensitive**) | Yes | `CLNT-SSN` 9(9) | Stored/displayed in clear in legacy; encrypt in FlowX |
| governmentId | String(20) | No | `CLNT-GOVT-ISSUED-ID` X(20) | |
| dateOfBirth | Date | Yes | `CLNT-DOB-YYYY-MM-DD` X(10) | Validated not in the future |
| eftAccountId | String(10) | No | `CLNT-EFT-ACCOUNT-ID` X(10) | |
| primaryCardHolder | Boolean | Yes | `CLNT-PRI-CRD-HOLDER-IND` X(1) | Y/N |
| ficoScore | Integer (300-850) | No | `CLNT-FICO-CREDIT-SCORE` 9(3) | |

## DT-03 Card

Legacy source: `/app/cpy/LXV023Y.cpy` (150 bytes). Primary key `cardNumber`; secondary index on `accountId` (replaces AIX `CRDAIX`).

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| cardNumber | String(16) numeric | Yes | `CRD-NUM` X(16) | |
| accountId | String(11) | Yes | `CRD-LACC-ID` 9(11) | FK to Account |
| cvv | String(3) (**sensitive**) | Yes | `CRD-CVV-CD` 9(3) | Clear text in legacy; tokenise |
| embossedName | String(50) | Yes | `CRD-EMBOSSED-NAME` X(50) | Alphabetic + spaces only |
| expiryDate | Date | Yes | `CRD-EXPIRY-DATE` X(10) | Month 1-12, year validated |
| activeStatus | Enumeration `CardActiveStatus` | Yes | `CRD-ACTIVE-STATUS` X(1) | Y / N |

## DT-04 CardXref

Legacy source: `/app/cpy/LXV024Y.cpy` (50 bytes). Primary key `cardNumber`; secondary index on `accountId` (replaces AIX `LKACAIX`).

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| cardNumber | String(16) | Yes | `LINK-CRD-NUM` X(16) | |
| customerId | String(9) | Yes | `LINK-CLNT-ID` 9(9) | FK to Customer |
| accountId | String(11) | Yes | `LINK-LACC-ID` 9(11) | FK to Account |

## DT-05 Transaction

Legacy source: `/app/cpy/LXV030Y.cpy` (350 bytes). Primary key `transactionId` (16 chars). Secondary access by `cardNumber` + processed timestamp (legacy AIX/`TXNIDX` — see {{TODO: confirm alternate index definition in /app/jcl/TXNIDX.jcl}}).

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| transactionId | String(16) | Yes | `TXN-ID` X(16) | Legacy: last record + 1 (collision risk); FlowX: sequence generator |
| typeCode | Enumeration `TransactionTypeCode` | Yes | `TXN-TYPE-CD` X(2) | 01-07 |
| categoryCode | Enumeration `TransactionCategoryCode` | Yes | `TXN-CAT-CD` 9(4) | |
| source | String(10) | Yes | `TXN-SOURCE` X(10) | e.g. POS TERM, OPERATOR |
| description | String(100) | Yes | `TXN-DESC` X(100) | |
| amount | Number (2 dec) | Yes | `TXN-AMT` S9(9)V99 | Format -99999999.99 |
| merchantId | String(9) numeric | Yes | `TXN-MERCHANT-ID` 9(9) | |
| merchantName | String(50) | Yes | `TXN-MERCHANT-NAME` X(50) | |
| merchantCity | String(50) | Yes | `TXN-MERCHANT-CITY` X(50) | |
| merchantZip | String(10) | Yes | `TXN-MERCHANT-ZIP` X(10) | |
| cardNumber | String(16) | Yes | `TXN-CRD-NUM` X(16) | FK to Card |
| originalTimestamp | DateTime | Yes | `TXN-ORIG-TS` X(26) | |
| processedTimestamp | DateTime | Yes | `TXN-PROC-TS` X(26) | |

## DT-06 TransactionCategoryBalance

Legacy source `LXV026Y` (50 bytes). Composite key `accountId + typeCode + categoryCode`.

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| accountId | String(11) | Yes | `BCAT-LACC-ID` 9(11) | |
| typeCode | String(2) | Yes | `BCAT-TYPE-CD` X(2) | |
| categoryCode | String(4) | Yes | `BCAT-CD` 9(4) | |
| balance | Number (2 dec) | Yes | `TXN-CAT-BAL` S9(9)V99 | Running balance per category; basis of interest calculation |

## DT-07 DisclosureGroup

Legacy source `LXV027Y` (50 bytes). Composite key `groupId + typeCode + categoryCode`. Seed data: `/app/data/ASCII/rategrp.txt` (51 rows; groups `A000000000`, `STANDARD`, `ZEROAPR`).

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| groupId | String(10) | Yes | `RG-LACC-GROUP-ID` X(10) | |
| typeCode | String(2) | Yes | `RG-TXN-TYPE-CD` X(2) | |
| categoryCode | String(4) | Yes | `RG-TXN-CAT-CD` 9(4) | |
| interestRate | Number (2 dec) | Yes | `RG-INT-RATE` S9(4)V99 | Annual percent; seed file stores signed overpunch (`0150{` = 15.00) — convert at load |

## DT-08 TransactionType

Legacy sources `LXV028Y` / DB2 `TRANSACTION_TYPE(TR_TYPE CHAR(2) PK, TR_DESCRIPTION VARCHAR(50))` / `txntype.txt`.

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| typeCode | String(2) | Yes | `TXN-TYPE` / `TR_TYPE` | PK |
| description | String(50) | Yes | `TXN-TYPE-DESC` / `TR_DESCRIPTION` | |

## DT-09 TransactionCategory

Legacy sources `LXV029Y` / DB2 `TRANSACTION_TYPE_CATEGORY` (PK `TRC_TYPE_CODE`+`TRC_TYPE_CATEGORY`, FK to TRANSACTION_TYPE ON DELETE RESTRICT) / `txncatg.txt` (18 rows).

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| typeCode | String(2) | Yes | `TXN-TYPE-CD` / `TRC_TYPE_CODE` | FK to TransactionType; delete restricted when categories exist |
| categoryCode | String(4) | Yes | `TXN-CAT-CD` / `TRC_TYPE_CATEGORY` | |
| description | String(50) | Yes | `TXN-CAT-TYPE-DESC` / `TRC_CAT_DATA` | |

## DT-10 UserAccount

Legacy source `/app/cpy/LXS020Y.cpy` (80 bytes), VSAM KSDS OPRSEC key (8,0). Sample users in `LXZ032J.jcl`.

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| userId | String(8) | Yes | `OPR-OP-ID` X(8) | Upper-cased on sign-on |
| firstName | String(20) | Yes | `OPR-OP-FNAME` X(20) | |
| lastName | String(20) | Yes | `OPR-OP-LNAME` X(20) | |
| password | Credential hash (**sensitive**) | Yes | `OPR-OP-PWD` X(8) | Plain text in legacy; replaced by FlowX IAM credential {{DECISION: Authentication delegated to the FlowX identity provider; `password` is not stored in the Project Data Type.}} |
| userType | Enumeration `UserType` | Yes | `OPR-OP-TYPE` X(1) | A = Admin, U = Regular |

## DT-11 DailyTransaction

Legacy `LXV031Y` (350 bytes), sequential file DAYTXN (input of POSTDAY). Same attributes as [Transaction](#dt-05-transaction) with prefix `DAYTXN-` plus `cardNumber` used for xref lookup; additionally `batchId` and `receivedTimestamp` (new, FlowX-only).

## DT-12 RejectedTransaction

Legacy: DAYREJ output of `LXB007C` = 350-byte transaction image + validation trailer.

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| dailyTransaction | Object (DailyTransaction) | Yes | DAYREJ record body | Original record |
| rejectReason | Enumeration `RejectReasonCode` | Yes | `WS-VALIDATION-FAIL-REASON` 9(4) | 100-103 |
| rejectReasonDescription | String(76) | Yes | `WS-VALIDATION-FAIL-REASON-DESC` | {{TODO: confirm trailer layout (4 + 76) in LXB007C working storage}} |
| reviewStatus | String | No | New | OPEN / RESOLVED (see [Rejected Transaction view](../06-task-management/view-rejected-transaction-review.md)) |

## DT-13 PendingAuthSummary (optional authorization module)

Legacy `CIPAUSMY` (IMS root segment).

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| accountId | String(11) | Yes | `PA-LACC-ID` S9(11) COMP-3 | Key |
| customerId | String(9) | Yes | `PA-CLNT-ID` 9(9) | |
| authStatus | String(1) | No | `PA-AUTH-STATUS` X | |
| accountStatus | List of String(2) (max 5) | No | `PA-ACCOUNT-STATUS` X(2) x5 | |
| creditLimit | Number | Yes | `PA-CREDIT-LIMIT` S9(9)V99 COMP-3 | |
| cashLimit | Number | Yes | `PA-CASH-LIMIT` | |
| creditBalance | Number | Yes | `PA-CREDIT-BALANCE` | |
| cashBalance | Number | Yes | `PA-CASH-BALANCE` | |
| approvedCount / declinedCount | Integer | Yes | `PA-APPROVED-AUTH-CNT` / `PA-DECLINED-AUTH-CNT` S9(4) COMP | |
| approvedAmount / declinedAmount | Number | Yes | `PA-APPROVED-AUTH-AMT` / `PA-DECLINED-AUTH-AMT` | |

## DT-14 PendingAuthDetail (optional authorization module)

Legacy `CIPAUDTY` (IMS child segment). Key: `accountId` + `authDate` + `authTime` (stored inverted in IMS for descending order).

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| accountId | String(11) | Yes | parent key | FK to PendingAuthSummary |
| authDate / authTime | Date / Time | Yes | `PA-AUTHORIZATION-KEY` (COMP-3) | |
| originalDate / originalTime | Date / Time | Yes | `PA-ORIG-DATE/TIME` | |
| cardNumber | String(16) | Yes | `PA-CRD-NUM` X(16) | |
| authType | String(4) | Yes | `PA-AUTH-TYPE` X(4) | |
| cardExpiry | String(4) | Yes | `PA-CRD-EXPIRY-DATE` X(4) | MMYY |
| messageType / messageSource | String(6) | Yes | `PA-MESSAGE-TYPE`, `PA-MESSAGE-SOURCE` | |
| authIdCode | String(6) | Yes | `PA-AUTH-ID-CODE` | |
| responseCode | Enumeration `AuthResponseCode` | Yes | `PA-AUTH-RESP-CODE` X(2) | 88 APPROVED = '00' |
| responseReason | Enumeration `AuthDeclineReasonCode` | Yes | `PA-AUTH-RESP-REASON` X(4) | |
| processingCode | Integer(6) | Yes | `PA-PROCESSING-CODE` 9(6) | |
| transactionAmount / approvedAmount | Number | Yes | `PA-TRANSACTION-AMT`, `PA-APPROVED-AMT` S9(10)V99 | |
| merchantCategoryCode | String(4) | Yes | `PA-MERCHANT-CATAGORY-CODE` | |
| acquirerCountryCode | String(3) | No | `PA-ACQR-COUNTRY-CODE` | |
| posEntryMode | Integer(2) | No | `PA-POS-ENTRY-MODE` 9(2) | |
| merchantId / merchantName / merchantCity / merchantState / merchantZip | String | Yes | `PA-MERCHANT-ID` X(15), `-NAME` X(22), `-CITY` X(13), `-STATE` X(2), `-ZIP` X(9) | |
| transactionId | String(15) | Yes | `PA-TRANSACTION-ID` | |
| matchStatus | Enumeration `AuthMatchStatus` | Yes | `PA-MATCH-STATUS` X(1) | P/D/E/M |
| fraudFlag | Enumeration `AuthFraudFlag` | No | `PA-AUTH-FRAUD` X(1) | F/R |
| fraudReportDate | Date | No | `PA-FRAUD-RPT-DATE` X(8) | |

## DT-15 AuthFraudRecord (optional authorization module)

Legacy DB2 `LEDGERLINE.AUTHFRD` (written by `LXO017C`). PK `cardNumber + authTimestamp`. Attributes mirror [PendingAuthDetail](#dt-14-pendingauthdetail-optional-authorization-module) plus `accountId` (DECIMAL 11) and `customerId` (DECIMAL 9), plus fraud action (`F` confirm / `R` remove) and `fraudReportDate`. Legacy source column: each attribute maps 1:1 to the like-named `AUTHFRD` column in `/app/app-authorization-ims-db2-mq/ddl/AUTHFRD.ddl`.

## DT-16 SessionContext (COMMAREA replacement)

Legacy `LXO014Y` (LEDGERLINE-COMMAREA). In FlowX this is **process data**, not a persisted type; it is passed from the Sign-on process to Menu and onwards via Call Activity input/output mapping.

| Attribute | Type | Legacy Source | Description |
|-----------|------|---------------|-------------|
| fromTransactionId / fromProgram | String | `LLINE-FROM-TRANID`, `LLINE-FROM-PROGRAM` | Navigation origin (replaced by FlowX navigation) |
| toTransactionId / toProgram | String | `LLINE-TO-TRANID`, `LLINE-TO-PROGRAM` | Navigation target |
| userId | String(8) | `LLINE-USER-ID` | |
| userType | Enumeration `UserType` | `LLINE-USER-TYPE` (88 LLINE-USRTYP-ADMIN/USER) | |
| programContext | Enumeration `ProgramContext` | `LLINE-PGM-CONTEXT` (88 ENTER/REENTER) | Not needed in FlowX (stateful process) |
| customerId / accountId / cardNumber | String | `LLINE-CLNT-ID`, `LLINE-LACC-ID`, `LLINE-CRD-NUM` | Selected record context |
| customerFirst/Middle/LastName | String | `LLINE-CLNT-FNAME/MNAME/LNAME` | |
| lastMap / lastMapset | String | `LLINE-LAST-MAP`, `LLINE-LAST-MAPSET` | Not needed |

## DT-17 StatementData

Built in memory by `LXB005A`/`LXB006B` (xref → customer → account → transactions, using 2-D table, ALTER/GO TO control flow). Output formats: fixed text `STMTDS` and HTML `HTMLDS`.

| Attribute | Type | Legacy Source | Description |
|-----------|------|---------------|-------------|
| statementId | String | New | |
| accountId, customerId, cardNumber | String | xref | |
| customerName, customerAddress | String | Customer | |
| currentBalance, creditLimit | Number | Account | |
| ficoScore | Integer | Customer | Printed on statement |
| lines | List of Transaction summaries | Transaction file | id, description, amount |
| totalExpenditure | Number | computed | Sum of lines |
| statementDocumentRef | String | New | Reference to Document Plugin output |

## DT-18 BranchExportRecord

`CBEXPORT` writes a multi-record-type export (customer, account, xref, transaction, card) into a single sequential file (`CVEXPORT` layout); `CBIMPORT` reads it back and splits into target files with an error file. Record-type codes (from `CBEXPORT`): `C` = customer, `A` = account, `X` = card cross-reference, `T` = transaction, `D` = card. Common header: record type (1), timestamp (26), sequence number (COMP), branch id (4), region code (5), then a 460-byte data area redefined per type (total 500 bytes). Note the export copies `ssn` in clear (finding in [Legacy Overview](../12-legacy-analysis/legacy-overview.md)).

## DT-19 OptionalModuleToggles (FeatureToggle Data Type)

Replaces the CICS `INQUIRE PROGRAM` check used by `LXO015C` to hide menu options of non-installed optional modules. See [Enumerations](enumerations.md) and the config bucket rules in [Architecture Overview](../00-project-overview/architecture-overview.md).

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| pendingAuthorizationEnabled | Boolean | false | Menu option 11 (LXO016C) |
| transactionTypeMaintenanceEnabled | Boolean | false | Admin options 5 and 6 (COTRTLIC / COTRTUPC) |
| mqInquiryEnabled | Boolean | false | MQ date/account inquiry services |

## Relationships

See [Data Model Diagram](data-model-diagram.md). Key referential rules (legacy enforced in code, not in VSAM):

- Card → Account via `accountId`; Card → Customer via CardXref.
- Transaction → Card; TransactionCategoryBalance → Account + TransactionCategory.
- TransactionCategory → TransactionType (DB2 FK ON DELETE RESTRICT; VSAM had none).
- Account.groupId → DisclosureGroup.groupId (fallback `STANDARD` when no row for the group).
