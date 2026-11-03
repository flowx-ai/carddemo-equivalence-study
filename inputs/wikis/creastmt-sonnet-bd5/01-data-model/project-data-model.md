# Project Data Model

This page defines every **Project Data Type** of the AWS CardDemo FlowX application, derived from the legacy VSAM record layouts (`/app/cpy/*.cpy`), the optional-module IMS segments (`CIPAUSMY`, `CIPAUDTY`) and the DB2 DDL (`AUTHFRDS`, `TRANSACTION_TYPE`, `TRANSACTION_TYPE_CATEGORY`). The legacy-to-FlowX mapping is in the [Transformation Matrix](../12-legacy-analysis/transformation-matrix.md).

> All legacy VSAM / IMS / DB2 stores are replaced by **FlowX Persistence (App Data Store)**. Access always goes through an [Integration Workflow](../04-integrations/integration-inventory.md) (DATA_SOURCE node on the `carddemo-datastore` NOSQL_DB System).
> {{DECISION: Keep one NOSQL_DB System (`carddemo-datastore`) with one collection per Project Data Type, instead of separate systems per legacy store (VSAM / IMS / DB2).}}

## Data Type Index

| ID | Project Data Type | Legacy Source | Legacy Store / Record Size | Collection |
|----|-------------------|---------------|----------------------------|------------|
| DT-01 | Account | `CVACT01Y` | VSAM KSDS ACCTDAT / 300 | `accounts` |
| DT-02 | Customer | `CVCUS01Y` | VSAM KSDS CUSTDAT / 500 | `customers` |
| DT-03 | Card | `CVACT02Y` | VSAM KSDS CARDDAT (+AIX CARDAIX) / 150 | `cards` |
| DT-04 | CardXref | `CVACT03Y` | VSAM KSDS CCXREF (+AIX CXACAIX) / 50 | `card_xrefs` |
| DT-05 | Transaction | `CVTRA05Y` | VSAM KSDS TRANSACT / 350 | `transactions` |
| DT-06 | TransactionCategoryBalance | `CVTRA01Y` | VSAM KSDS TCATBALF / 50 | `tran_cat_balances` |
| DT-07 | DisclosureGroup | `CVTRA02Y` | VSAM KSDS DISCGRP / 50 | `disclosure_groups` |
| DT-08 | TransactionType | `CVTRA03Y`, DB2 `TRANSACTION_TYPE` | VSAM TRANTYPE / 60, DB2 | `transaction_types` |
| DT-09 | TransactionCategory | `CVTRA04Y`, DB2 `TRANSACTION_TYPE_CATEGORY` | VSAM TRANCATG / 60, DB2 | `transaction_categories` |
| DT-10 | UserAccount | `CSUSR01Y` | VSAM KSDS USRSEC / 80 | `user_accounts` |
| DT-11 | DailyTransaction | `CVTRA06Y` | Sequential DALYTRAN / 350 | `daily_transactions` |
| DT-12 | RejectedTransaction | `CBTRN02C` (DALYREJS) | Sequential / 430 | `rejected_transactions` |
| DT-13 | PendingAuthSummary | `CIPAUSMY` (IMS root) | IMS PAUTSUM0 | `pending_auth_summaries` |
| DT-14 | PendingAuthDetail | `CIPAUDTY` (IMS child) | IMS PAUTDTL1 | `pending_auth_details` |
| DT-15 | AuthFraudRecord | DB2 `CARDDEMO.AUTHFRDS` | DB2 table | `auth_fraud_records` |
| DT-16 | SessionContext | `COCOM01Y` (COMMAREA) | CICS COMMAREA | process data (`session`) |
| DT-17 | StatementData | `CBSTM03A/B` (in-memory) | Working storage + STMTFILE/HTMLFILE | `statements` |
| DT-18 | BranchExportRecord | `CVEXPORT` / `CBEXPORT` | Sequential EXPFILE | `export_records` |
| DT-19 | OptionalModuleToggles | CICS `INQUIRE PROGRAM` check (COMEN01C) | None | FeatureToggle Data Type |

---

## DT-01 Account

Legacy source: `/app/cpy/CVACT01Y.cpy` (300 bytes). Primary key `accountId`.

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| accountId | String(11) numeric | Yes | `ACCT-ID` 9(11) | Account number, non-zero |
| activeStatus | Enumeration `AccountActiveStatus` | Yes | `ACCT-ACTIVE-STATUS` X(1) | Y / N |
| currentBalance | Number (2 dec) | Yes | `ACCT-CURR-BAL` S9(10)V99 | Current balance |
| creditLimit | Number (2 dec) | Yes | `ACCT-CREDIT-LIMIT` S9(10)V99 | Credit limit |
| cashCreditLimit | Number (2 dec) | Yes | `ACCT-CASH-CREDIT-LIMIT` S9(10)V99 | Cash credit limit |
| openDate | Date (YYYY-MM-DD) | Yes | `ACCT-OPEN-DATE` X(10) | Account open date |
| expiryDate | Date | Yes | `ACCT-EXPIRAION-DATE` X(10) (legacy typo) | Account expiry date |
| reissueDate | Date | No | `ACCT-REISSUE-DATE` X(10) | Reissue date |
| currentCycleCredit | Number (2 dec) | Yes | `ACCT-CURR-CYC-CREDIT` S9(10)V99 | Credits in current cycle |
| currentCycleDebit | Number (2 dec) | Yes | `ACCT-CURR-CYC-DEBIT` S9(10)V99 | Debits in current cycle |
| addressZip | String(10) | No | `ACCT-ADDR-ZIP` X(10) | Billing ZIP |
| groupId | String(10) | Yes | `ACCT-GROUP-ID` X(10) | Disclosure Group id (A000000000 / DEFAULT / ZEROAPR) |

Legacy FILLER (178 bytes) is dropped. Misspelling `EXPIRAION` is corrected (see [Feature Improvements](../11-implementation-plan/feature-improvements.md)).

## DT-02 Customer

Legacy source: `/app/cpy/CVCUS01Y.cpy` (500 bytes). Primary key `customerId`.

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| customerId | String(9) numeric | Yes | `CUST-ID` 9(9) | Customer id |
| firstName | String(25) | Yes | `CUST-FIRST-NAME` X(25) | Alphabetic + spaces only |
| middleName | String(25) | No | `CUST-MIDDLE-NAME` X(25) | |
| lastName | String(25) | Yes | `CUST-LAST-NAME` X(25) | |
| addressLine1..3 | String(50) | Line 1,2: Yes | `CUST-ADDR-LINE-1..3` X(50) | Street, line 2, city/other |
| addressState | String(2) | Yes | `CUST-ADDR-STATE-CD` X(2) | US state code |
| addressCountry | String(3) | Yes | `CUST-ADDR-COUNTRY-CD` X(3) | Country code |
| addressZip | String(10) | Yes | `CUST-ADDR-ZIP` X(10) | |
| phone1, phone2 | String(15) | Phone1: Yes | `CUST-PHONE-NUM-1/2` X(15) | Format (AAA)BBB-CCCC |
| ssn | String(9) numeric (**sensitive**) | Yes | `CUST-SSN` 9(9) | Stored/displayed in clear in legacy; encrypt in FlowX |
| governmentId | String(20) | No | `CUST-GOVT-ISSUED-ID` X(20) | |
| dateOfBirth | Date | Yes | `CUST-DOB-YYYY-MM-DD` X(10) | Validated not in the future |
| eftAccountId | String(10) | No | `CUST-EFT-ACCOUNT-ID` X(10) | |
| primaryCardHolder | Boolean | Yes | `CUST-PRI-CARD-HOLDER-IND` X(1) | Y/N |
| ficoScore | Integer (300-850) | No | `CUST-FICO-CREDIT-SCORE` 9(3) | |

## DT-03 Card

Legacy source: `/app/cpy/CVACT02Y.cpy` (150 bytes). Primary key `cardNumber`; secondary index on `accountId` (replaces AIX `CARDAIX`).

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| cardNumber | String(16) numeric | Yes | `CARD-NUM` X(16) | |
| accountId | String(11) | Yes | `CARD-ACCT-ID` 9(11) | FK to Account |
| cvv | String(3) (**sensitive**) | Yes | `CARD-CVV-CD` 9(3) | Clear text in legacy; tokenise |
| embossedName | String(50) | Yes | `CARD-EMBOSSED-NAME` X(50) | Alphabetic + spaces only |
| expiryDate | Date | Yes | `CARD-EXPIRAION-DATE` X(10) | Month 1-12, year validated |
| activeStatus | Enumeration `CardActiveStatus` | Yes | `CARD-ACTIVE-STATUS` X(1) | Y / N |

## DT-04 CardXref

Legacy source: `/app/cpy/CVACT03Y.cpy` (50 bytes). Primary key `cardNumber`; secondary index on `accountId` (replaces AIX `CXACAIX`).

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| cardNumber | String(16) | Yes | `XREF-CARD-NUM` X(16) | |
| customerId | String(9) | Yes | `XREF-CUST-ID` 9(9) | FK to Customer |
| accountId | String(11) | Yes | `XREF-ACCT-ID` 9(11) | FK to Account |

## DT-05 Transaction

Legacy source: `/app/cpy/CVTRA05Y.cpy` (350 bytes). Primary key `transactionId` (16 chars). Secondary access by `cardNumber` + processed timestamp (legacy AIX/`TRANIDX` — see {{TODO: confirm alternate index definition in /app/jcl/TRANIDX.jcl}}).

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| transactionId | String(16) | Yes | `TRAN-ID` X(16) | Legacy: last record + 1 (collision risk); FlowX: sequence generator |
| typeCode | Enumeration `TransactionTypeCode` | Yes | `TRAN-TYPE-CD` X(2) | 01-07 |
| categoryCode | Enumeration `TransactionCategoryCode` | Yes | `TRAN-CAT-CD` 9(4) | |
| source | String(10) | Yes | `TRAN-SOURCE` X(10) | e.g. POS TERM, OPERATOR |
| description | String(100) | Yes | `TRAN-DESC` X(100) | |
| amount | Number (2 dec) | Yes | `TRAN-AMT` S9(9)V99 | Format -99999999.99 |
| merchantId | String(9) numeric | Yes | `TRAN-MERCHANT-ID` 9(9) | |
| merchantName | String(50) | Yes | `TRAN-MERCHANT-NAME` X(50) | |
| merchantCity | String(50) | Yes | `TRAN-MERCHANT-CITY` X(50) | |
| merchantZip | String(10) | Yes | `TRAN-MERCHANT-ZIP` X(10) | |
| cardNumber | String(16) | Yes | `TRAN-CARD-NUM` X(16) | FK to Card |
| originalTimestamp | DateTime | Yes | `TRAN-ORIG-TS` X(26) | |
| processedTimestamp | DateTime | Yes | `TRAN-PROC-TS` X(26) | |

## DT-06 TransactionCategoryBalance

Legacy source `CVTRA01Y` (50 bytes). Composite key `accountId + typeCode + categoryCode`.

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| accountId | String(11) | Yes | `TRANCAT-ACCT-ID` 9(11) | |
| typeCode | String(2) | Yes | `TRANCAT-TYPE-CD` X(2) | |
| categoryCode | String(4) | Yes | `TRANCAT-CD` 9(4) | |
| balance | Number (2 dec) | Yes | `TRAN-CAT-BAL` S9(9)V99 | Running balance per category; basis of interest calculation |

## DT-07 DisclosureGroup

Legacy source `CVTRA02Y` (50 bytes). Composite key `groupId + typeCode + categoryCode`. Seed data: `/app/data/ASCII/discgrp.txt` (51 rows; groups `A000000000`, `DEFAULT`, `ZEROAPR`).

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| groupId | String(10) | Yes | `DIS-ACCT-GROUP-ID` X(10) | |
| typeCode | String(2) | Yes | `DIS-TRAN-TYPE-CD` X(2) | |
| categoryCode | String(4) | Yes | `DIS-TRAN-CAT-CD` 9(4) | |
| interestRate | Number (2 dec) | Yes | `DIS-INT-RATE` S9(4)V99 | Annual percent; seed file stores signed overpunch (`0150{` = 15.00) — convert at load |

## DT-08 TransactionType

Legacy sources `CVTRA03Y` / DB2 `TRANSACTION_TYPE(TR_TYPE CHAR(2) PK, TR_DESCRIPTION VARCHAR(50))` / `trantype.txt`.

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| typeCode | String(2) | Yes | `TRAN-TYPE` / `TR_TYPE` | PK |
| description | String(50) | Yes | `TRAN-TYPE-DESC` / `TR_DESCRIPTION` | |

## DT-09 TransactionCategory

Legacy sources `CVTRA04Y` / DB2 `TRANSACTION_TYPE_CATEGORY` (PK `TRC_TYPE_CODE`+`TRC_TYPE_CATEGORY`, FK to TRANSACTION_TYPE ON DELETE RESTRICT) / `trancatg.txt` (18 rows).

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| typeCode | String(2) | Yes | `TRAN-TYPE-CD` / `TRC_TYPE_CODE` | FK to TransactionType; delete restricted when categories exist |
| categoryCode | String(4) | Yes | `TRAN-CAT-CD` / `TRC_TYPE_CATEGORY` | |
| description | String(50) | Yes | `TRAN-CAT-TYPE-DESC` / `TRC_CAT_DATA` | |

## DT-10 UserAccount

Legacy source `/app/cpy/CSUSR01Y.cpy` (80 bytes), VSAM KSDS USRSEC key (8,0). Sample users in `DUSRSECJ.jcl`.

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| userId | String(8) | Yes | `SEC-USR-ID` X(8) | Upper-cased on sign-on |
| firstName | String(20) | Yes | `SEC-USR-FNAME` X(20) | |
| lastName | String(20) | Yes | `SEC-USR-LNAME` X(20) | |
| password | Credential hash (**sensitive**) | Yes | `SEC-USR-PWD` X(8) | Plain text in legacy; replaced by FlowX IAM credential {{DECISION: Authentication delegated to the FlowX identity provider; `password` is not stored in the Project Data Type.}} |
| userType | Enumeration `UserType` | Yes | `SEC-USR-TYPE` X(1) | A = Admin, U = Regular |

## DT-11 DailyTransaction

Legacy `CVTRA06Y` (350 bytes), sequential file DALYTRAN (input of POSTTRAN). Same attributes as [Transaction](#dt-05-transaction) with prefix `DALYTRAN-` plus `cardNumber` used for xref lookup; additionally `batchId` and `receivedTimestamp` (new, FlowX-only).

## DT-12 RejectedTransaction

Legacy: DALYREJS output of `CBTRN02C` = 350-byte transaction image + validation trailer.

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| dailyTransaction | Object (DailyTransaction) | Yes | DALYREJS record body | Original record |
| rejectReason | Enumeration `RejectReasonCode` | Yes | `WS-VALIDATION-FAIL-REASON` 9(4) | 100-103 |
| rejectReasonDescription | String(76) | Yes | `WS-VALIDATION-FAIL-REASON-DESC` | {{TODO: confirm trailer layout (4 + 76) in CBTRN02C working storage}} |
| reviewStatus | String | No | New | OPEN / RESOLVED (see [Rejected Transaction view](../06-task-management/view-rejected-transaction-review.md)) |

## DT-13 PendingAuthSummary (optional authorization module)

Legacy `CIPAUSMY` (IMS root segment).

| Attribute | Type | Required | Legacy Source | Description |
|-----------|------|----------|---------------|-------------|
| accountId | String(11) | Yes | `PA-ACCT-ID` S9(11) COMP-3 | Key |
| customerId | String(9) | Yes | `PA-CUST-ID` 9(9) | |
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
| cardNumber | String(16) | Yes | `PA-CARD-NUM` X(16) | |
| authType | String(4) | Yes | `PA-AUTH-TYPE` X(4) | |
| cardExpiry | String(4) | Yes | `PA-CARD-EXPIRY-DATE` X(4) | MMYY |
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

Legacy DB2 `CARDDEMO.AUTHFRDS` (written by `COPAUS2C`). PK `cardNumber + authTimestamp`. Attributes mirror [PendingAuthDetail](#dt-14-pendingauthdetail-optional-authorization-module) plus `accountId` (DECIMAL 11) and `customerId` (DECIMAL 9), plus fraud action (`F` confirm / `R` remove) and `fraudReportDate`. Legacy source column: each attribute maps 1:1 to the like-named `AUTHFRDS` column in `/app/app-authorization-ims-db2-mq/ddl/AUTHFRDS.ddl`.

## DT-16 SessionContext (COMMAREA replacement)

Legacy `COCOM01Y` (CARDDEMO-COMMAREA). In FlowX this is **process data**, not a persisted type; it is passed from the Sign-on process to Menu and onwards via Call Activity input/output mapping.

| Attribute | Type | Legacy Source | Description |
|-----------|------|---------------|-------------|
| fromTransactionId / fromProgram | String | `CDEMO-FROM-TRANID`, `CDEMO-FROM-PROGRAM` | Navigation origin (replaced by FlowX navigation) |
| toTransactionId / toProgram | String | `CDEMO-TO-TRANID`, `CDEMO-TO-PROGRAM` | Navigation target |
| userId | String(8) | `CDEMO-USER-ID` | |
| userType | Enumeration `UserType` | `CDEMO-USER-TYPE` (88 CDEMO-USRTYP-ADMIN/USER) | |
| programContext | Enumeration `ProgramContext` | `CDEMO-PGM-CONTEXT` (88 ENTER/REENTER) | Not needed in FlowX (stateful process) |
| customerId / accountId / cardNumber | String | `CDEMO-CUST-ID`, `CDEMO-ACCT-ID`, `CDEMO-CARD-NUM` | Selected record context |
| customerFirst/Middle/LastName | String | `CDEMO-CUST-FNAME/MNAME/LNAME` | |
| lastMap / lastMapset | String | `CDEMO-LAST-MAP`, `CDEMO-LAST-MAPSET` | Not needed |

## DT-17 StatementData

Built in memory by `CBSTM03A`/`CBSTM03B` (xref → customer → account → transactions, using 2-D table, ALTER/GO TO control flow). Output formats: fixed text `STMTFILE` and HTML `HTMLFILE`.

| Attribute | Type | Legacy Source | Description |
|-----------|------|---------------|-------------|
| statementId | String | New | |
| accountId, customerId, cardNumber | String | xref | |
| customerName, customerAddress | String | Customer | |
| currentBalance, creditLimit | Number | Account | |
| ficoScore | Integer | Customer | Printed on statement |
| lines | List of Transaction summaries | Transaction file | id, description, amount |
| totalExpenditure | Number | computed | Sum of the lines with an amount above zero |
| statementDocumentRef | String | New | Reference to Document Plugin output |

## DT-18 BranchExportRecord

`CBEXPORT` writes a multi-record-type export (customer, account, xref, transaction, card) into a single sequential file (`CVEXPORT` layout); `CBIMPORT` reads it back and splits into target files with an error file. Record-type codes (from `CBEXPORT`): `C` = customer, `A` = account, `X` = card cross-reference, `T` = transaction, `D` = card. Common header: record type (1), timestamp (26), sequence number (COMP), branch id (4), region code (5), then a 460-byte data area redefined per type (total 500 bytes). Note the export copies `ssn` in clear (finding in [Legacy Overview](../12-legacy-analysis/legacy-overview.md)).

## DT-19 OptionalModuleToggles (FeatureToggle Data Type)

Replaces the CICS `INQUIRE PROGRAM` check used by `COMEN01C` to hide menu options of non-installed optional modules. See [Enumerations](enumerations.md) and the config bucket rules in [Architecture Overview](../00-project-overview/architecture-overview.md).

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| pendingAuthorizationEnabled | Boolean | false | Menu option 11 (COPAUS0C) |
| transactionTypeMaintenanceEnabled | Boolean | false | Admin options 5 and 6 (COTRTLIC / COTRTUPC) |
| mqInquiryEnabled | Boolean | false | MQ date/account inquiry services |

## Relationships

See [Data Model Diagram](data-model-diagram.md). Key referential rules (legacy enforced in code, not in VSAM):

- Card → Account via `accountId`; Card → Customer via CardXref.
- Transaction → Card; TransactionCategoryBalance → Account + TransactionCategory.
- TransactionCategory → TransactionType (DB2 FK ON DELETE RESTRICT; VSAM had none).
- Account.groupId → DisclosureGroup.groupId (fallback `DEFAULT` when no row for the group).
