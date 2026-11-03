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
