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
