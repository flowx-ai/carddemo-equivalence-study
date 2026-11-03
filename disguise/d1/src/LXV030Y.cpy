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
