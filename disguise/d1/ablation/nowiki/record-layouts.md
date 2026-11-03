# Record layouts

Copybooks of the Ledgerline batch application, as referenced by CONTRACT.md (data definitions only).

## LXV022Y

```cobol
      *****************************************************************
      *    Data-structure for  account entity (RECLN 300)
      *****************************************************************
       01  ACCOUNT-RECORD.
           05  LACC-ID                           PIC 9(11).
           05  LACC-ACTIVE-STATUS                PIC X(01).
           05  LACC-CURR-BAL                     PIC S9(10)V99.
           05  LACC-CREDIT-LIMIT                 PIC S9(10)V99.
           05  LACC-CASH-CREDIT-LIMIT            PIC S9(10)V99.
           05  LACC-OPEN-DATE                    PIC X(10).
           05  LACC-EXPIRY-DATE               PIC X(10). 
           05  LACC-REISSUE-DATE                 PIC X(10).
           05  LACC-CURR-CYC-CREDIT              PIC S9(10)V99.
           05  LACC-CURR-CYC-DEBIT               PIC S9(10)V99.
           05  LACC-ADDR-ZIP                     PIC X(10).
           05  LACC-GROUP-ID                     PIC X(10).
           05  FILLER                            PIC X(178).      
      *
      * Ver: Ledgerline_v1.0-15-g27d6c6f-68 Date: 2022-07-19 23:15:59 CDT
      *
```

## LXV024Y

```cobol
      *****************************************************************         
      *    Data-structure for card xref (RECLN 50)                              
      *****************************************************************         
       01 CRD-LINK-RECORD.                                                     
           05  LINK-CRD-NUM                     PIC X(16).                     
           05  LINK-CLNT-ID                      PIC 9(09).                     
           05  LINK-LACC-ID                      PIC 9(11).                     
           05  FILLER                            PIC X(14).                     
      *
      * Ver: Ledgerline_v1.0-15-g27d6c6f-68 Date: 2022-07-19 23:16:00 CDT
      *
```

## LXV026Y

```cobol
      *****************************************************************         
      *    Data-structure for transaction category balance (RECLN = 50)         
      *****************************************************************         
       01  TXN-CAT-BAL-RECORD.                                                 
           05  TXN-CAT-KEY.                                                    
              10 BCAT-LACC-ID                       PIC 9(11).               
              10 BCAT-TYPE-CD                       PIC X(02).               
              10 BCAT-CD                            PIC 9(04).               
           05  TXN-CAT-BAL                            PIC S9(09)V99.           
           05  FILLER                                  PIC X(22).               
      *
      * Ver: Ledgerline_v1.0-15-g27d6c6f-68 Date: 2022-07-19 23:16:00 CDT
      *
```

## LXV027Y

```cobol
      *****************************************************************         
      *    Data-structure for disclosure group (RECLN = 50)                     
      *****************************************************************         
       01  RG-GROUP-RECORD.                                                    
           05  RG-GROUP-KEY.                                                   
              10 RG-LACC-GROUP-ID                     PIC X(10).               
              10 RG-TXN-TYPE-CD                      PIC X(02).               
              10 RG-TXN-CAT-CD                       PIC 9(04).               
           05  RG-INT-RATE                            PIC S9(04)V99.           
           05  FILLER                                  PIC X(28).               
      *
      * Ver: Ledgerline_v1.0-15-g27d6c6f-68 Date: 2022-07-19 23:16:00 CDT
      *
```

## LXV030Y

```cobol
      *****************************************************************         
      *    Data-structure for TRANsaction record (RECLN = 350)                  
      *****************************************************************         
       01  TXN-RECORD.                                                         
           05  TXN-ID                                 PIC X(16).               
           05  TXN-TYPE-CD                            PIC X(02).               
           05  TXN-CAT-CD                             PIC 9(04).               
           05  TXN-SOURCE                             PIC X(10).               
           05  TXN-DESC                               PIC X(100).              
           05  TXN-AMT                                PIC S9(09)V99.           
           05  TXN-MERCHANT-ID                        PIC 9(09).               
           05  TXN-MERCHANT-NAME                      PIC X(50).               
           05  TXN-MERCHANT-CITY                      PIC X(50).               
           05  TXN-MERCHANT-ZIP                       PIC X(10).               
           05  TXN-CRD-NUM                           PIC X(16).               
           05  TXN-ORIG-TS                            PIC X(26).               
           05  TXN-PROC-TS                            PIC X(26).               
           05  FILLER                                  PIC X(20).               
      *
      * Ver: Ledgerline_v1.0-15-g27d6c6f-68 Date: 2022-07-19 23:16:01 CDT
      *
```
