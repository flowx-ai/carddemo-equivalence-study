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
