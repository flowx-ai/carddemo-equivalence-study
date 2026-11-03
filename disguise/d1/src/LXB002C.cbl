      ******************************************************************
      * Program     : LXB002C.CBL                                      
      * Application : Ledgerline                                          
      * Type        : BATCH COBOL Program                                
      * Function    : This is a interest calculator program.
      ******************************************************************
      * Copyright Amazon.com, Inc. or its affiliates.                   
      * All Rights Reserved.                                            
      *                                                                 
      * Licensed under the Apache License, Version 2.0 (the "License"). 
      * You may not use this file except in compliance with the License.
      * You may obtain a copy of the License at                         
      *                                                                 
      *    http://www.apache.org/licenses/LICENSE-2.0                   
      *                                                                 
      * Unless required by applicable law or agreed to in writing,      
      * software distributed under the License is distributed on an     
      * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,    
      * either express or implied. See the License for the specific     
      * language governing permissions and limitations under the License
      ******************************************************************
       IDENTIFICATION DIVISION.                                                 
       PROGRAM-ID.    LXB002C.                                                 
       AUTHOR.        LEDGERLINE.                                                      
       ENVIRONMENT DIVISION.                                                    
       INPUT-OUTPUT SECTION.                                                    
       FILE-CONTROL.                                                            
           SELECT BALCAT-FILE ASSIGN TO BALCATF                               
                  ORGANIZATION IS INDEXED                                       
                  ACCESS MODE  IS SEQUENTIAL                                    
                  RECORD KEY   IS FD-TXN-CAT-KEY                               
                  FILE STATUS  IS BALCATF-STATUS.                              
                                                                                
           SELECT LINK-FILE ASSIGN TO   LINKFILE                                
                  ORGANIZATION IS INDEXED                                       
                  ACCESS MODE  IS RANDOM                                        
                  RECORD KEY   IS FD-LINK-CRD-NUM                              
                  ALTERNATE RECORD KEY IS FD-LINK-LACC-ID                       
                  FILE STATUS  IS LINKFILE-STATUS.                              
                                                                                
           SELECT ACCOUNT-FILE ASSIGN TO LEDGFILE                               
                  ORGANIZATION IS INDEXED                                       
                  ACCESS MODE  IS RANDOM                                        
                  RECORD KEY   IS FD-LACC-ID                                    
                  FILE STATUS  IS LEDGFILE-STATUS.                              
                                                                                
           SELECT RATEGRP-FILE ASSIGN TO RATEGRP                                
                  ORGANIZATION IS INDEXED                                       
                  ACCESS MODE  IS RANDOM                                        
                  RECORD KEY   IS FD-RATEGRP-KEY                                
                  FILE STATUS  IS RATEGRP-STATUS.                               
                                                                                
           SELECT TXNFILE-FILE ASSIGN TO TXNFILE                              
                  ORGANIZATION IS SEQUENTIAL                                    
                  ACCESS MODE  IS SEQUENTIAL                                    
                  FILE STATUS  IS TXNFILEX-STATUS.                              
                                                                                
      *                                                                         
       DATA DIVISION.                                                           
       FILE SECTION.                                                            
       FD  BALCAT-FILE.                                                        
       01  FD-TXN-CAT-BAL-RECORD.                                              
           05 FD-TXN-CAT-KEY.                                                  
              10 FD-BCAT-LACC-ID             PIC 9(11).                      
              10 FD-BCAT-TYPE-CD             PIC X(02).                      
              10 FD-BCAT-CD                  PIC 9(04).                      
           05 FD-FD-TXN-CAT-DATA               PIC X(33).                      
                                                                                
       FD  LINK-FILE.                                                           
       01  FD-LINKFILE-REC.                                                     
           05 FD-LINK-CRD-NUM                  PIC X(16).                      
           05 FD-LINK-CLNT-NUM                  PIC 9(09).                      
           05 FD-LINK-LACC-ID                   PIC 9(11).                      
           05 FD-LINK-FILLER                    PIC X(14).                      
                                                                                
       FD  RATEGRP-FILE.                                                        
       01  FD-RATEGRP-REC.                                                      
           05 FD-RATEGRP-KEY.                                                   
              10 FD-RG-LACC-GROUP-ID           PIC X(10).                      
              10 FD-RG-TXN-TYPE-CD            PIC X(02).                      
              10 FD-RG-TXN-CAT-CD             PIC 9(04).                      
           05 FD-RATEGRP-DATA                   PIC X(34).                      
                                                                                
       FD  ACCOUNT-FILE.                                                        
       01  FD-LEDGFILE-REC.                                                     
           05 FD-LACC-ID                        PIC 9(11).                      
           05 FD-LACC-DATA                      PIC X(289).                     
                                                                                
       FD  TXNFILE-FILE.                                                       
       01  FD-TXNFILEX-REC.                                                     
           05 FD-TRANS-ID                       PIC X(16).                      
           05 FD-LACC-DATA                      PIC X(334).                     
                                                                                
       WORKING-STORAGE SECTION.                                                 
                                                                                
      *****************************************************************         
       COPY LXV026Y.                                                           
       01  BALCATF-STATUS.                                                     
           05  BALCATF-STAT1      PIC X.                                       
           05  BALCATF-STAT2      PIC X.                                       
                                                                                
       COPY LXV024Y.                                                           
       01  LINKFILE-STATUS.                                                     
           05  LINKFILE-STAT1      PIC X.                                       
           05  LINKFILE-STAT2      PIC X.                                       
                                                                                
       COPY LXV027Y.                                                           
       01  RATEGRP-STATUS.                                                      
           05 RATEGRP-STAT1        PIC X.                                       
           05 RATEGRP-STAT2        PIC X.                                       
                                                                                
       COPY LXV022Y.                                                           
       01  LEDGFILE-STATUS.                                                     
           05  LEDGFILE-STAT1      PIC X.                                       
           05  LEDGFILE-STAT2      PIC X.                                       
                                                                                
       COPY LXV030Y.                                                           
       01  TXNFILEX-STATUS.                                                     
           05  TXNFILEX-STAT1      PIC X.                                       
           05  TXNFILEX-STAT2      PIC X.                                       
                                                                                
       01  IO-STATUS.                                                           
           05  IO-STAT1            PIC X.                                       
           05  IO-STAT2            PIC X.                                       
       01  TWO-BYTES-BINARY        PIC 9(4) BINARY.                             
       01  TWO-BYTES-ALPHA         REDEFINES TWO-BYTES-BINARY.                  
           05  TWO-BYTES-LEFT      PIC X.                                       
           05  TWO-BYTES-RIGHT     PIC X.                                       
       01  IO-STATUS-04.                                                        
           05  IO-STATUS-0401      PIC 9   VALUE 0.                             
           05  IO-STATUS-0403      PIC 999 VALUE 0.                             
                                                                                
       01  APPL-RESULT             PIC S9(9)   COMP.                            
           88  APPL-AOK            VALUE 0.                                     
           88  APPL-EOF            VALUE 16.                                    
                                                                                
       01  END-OF-FILE             PIC X(01)    VALUE 'N'.                      
       01  ABCODE                  PIC S9(9) BINARY.                            
       01  TIMING                  PIC S9(9) BINARY.                            
      * T I M E S T A M P   D B 2  X(26)     EEEE-MM-DD-UU.MM.SS.HH0000         
       01  COBOL-TS.                                                            
           05 COB-YYYY                  PIC X(04).                              
           05 COB-MM                    PIC X(02).                              
           05 COB-DD                    PIC X(02).                              
           05 COB-HH                    PIC X(02).                              
           05 COB-MIN                   PIC X(02).                              
           05 COB-SS                    PIC X(02).                              
           05 COB-MIL                   PIC X(02).                              
           05 COB-REST                  PIC X(05).                              
       01  DB2-FORMAT-TS                PIC X(26).                              
       01  FILLER REDEFINES DB2-FORMAT-TS.                                      
           06 DB2-YYYY                  PIC X(004).                      E      
           06 DB2-STREEP-1              PIC X.                           -      
           06 DB2-MM                    PIC X(002).                      M      
           06 DB2-STREEP-2              PIC X.                           -      
           06 DB2-DD                    PIC X(002).                      D      
           06 DB2-STREEP-3              PIC X.                           -      
           06 DB2-HH                    PIC X(002).                      U      
           06 DB2-DOT-1                 PIC X.                                  
           06 DB2-MIN                   PIC X(002).                             
           06 DB2-DOT-2                 PIC X.                                  
           06 DB2-SS                    PIC X(002).                             
           06 DB2-DOT-3                 PIC X.                                  
           06 DB2-MIL                   PIC 9(002).                             
           06 DB2-REST                  PIC X(04).                              
       01 WS-MISC-VARS.                                                         
           05 WS-LAST-LACC-NUM          PIC X(11) VALUE SPACES.                 
           05 WS-MONTHLY-INT            PIC S9(09)V99.                          
           05 WS-TOTAL-INT              PIC S9(09)V99.                          
           05 WS-FIRST-TIME             PIC X(01) VALUE 'Y'.                    
       01 WS-COUNTERS.                                                          
           05 WS-RECORD-COUNT           PIC 9(09) VALUE 0.                      
           05 WS-TRANID-SUFFIX          PIC 9(06) VALUE 0.                      
                                                                                
       LINKAGE SECTION.                                                         
       01  EXTERNAL-PARMS.                                                      
           05  PARM-LENGTH         PIC S9(04) COMP.                             
           05  PARM-DATE           PIC X(10).                                   
      *****************************************************************         
       PROCEDURE DIVISION USING EXTERNAL-PARMS.                                 
           DISPLAY 'START OF EXECUTION OF PROGRAM LXB002C'.                    
           PERFORM 0000-BALCATF-OPEN.                                          
           PERFORM 0100-LINKFILE-OPEN.                                          
           PERFORM 0200-RATEGRP-OPEN.                                           
           PERFORM 0300-LEDGFILE-OPEN.                                          
           PERFORM 0400-TXNFILEX-OPEN.                                          
                                                                                
           PERFORM UNTIL END-OF-FILE = 'Y'                                      
               IF  END-OF-FILE = 'N'                                            
                   PERFORM 1000-BALCATF-GET-NEXT                               
                   IF  END-OF-FILE = 'N'                                        
                     ADD 1 TO WS-RECORD-COUNT                                   
                     DISPLAY TXN-CAT-BAL-RECORD                                
                     IF BCAT-LACC-ID NOT= WS-LAST-LACC-NUM                   
                       IF WS-FIRST-TIME NOT = 'Y'                               
                          PERFORM 1050-UPDATE-ACCOUNT                           
                       ELSE                                                     
                          MOVE 'N' TO WS-FIRST-TIME                             
                       END-IF                                                   
                       MOVE 0 TO WS-TOTAL-INT                                   
                       MOVE BCAT-LACC-ID TO WS-LAST-LACC-NUM                 
                       MOVE BCAT-LACC-ID TO FD-LACC-ID                       
                       PERFORM 1100-GET-LACC-DATA                               
                       MOVE BCAT-LACC-ID TO FD-LINK-LACC-ID                  
                       PERFORM 1110-GET-LINK-DATA                               
                     END-IF                                                     
      *              DISPLAY 'LACC-GROUP-ID: ' LACC-GROUP-ID                    
      *              DISPLAY 'BCAT-CD: ' BCAT-CD                          
      *              DISPLAY 'BCAT-TYPE-CD: ' BCAT-TYPE-CD                
                     MOVE LACC-GROUP-ID TO FD-RG-LACC-GROUP-ID                 
                     MOVE BCAT-CD TO FD-RG-TXN-CAT-CD                      
                     MOVE BCAT-TYPE-CD TO FD-RG-TXN-TYPE-CD                
                     PERFORM 1200-GET-INTEREST-RATE                             
                     IF RG-INT-RATE NOT = 0                                    
                       PERFORM 1300-COMPUTE-INTEREST                            
                       PERFORM 1400-COMPUTE-FEES                                
                     END-IF                                                     
                   END-IF                                                       
               ELSE                                                             
                    PERFORM 1050-UPDATE-ACCOUNT                                 
               END-IF                                                           
           END-PERFORM.                                                         
                                                                                
           PERFORM 9000-BALCATF-CLOSE.                                         
           PERFORM 9100-LINKFILE-CLOSE.                                         
           PERFORM 9200-RATEGRP-CLOSE.                                          
           PERFORM 9300-LEDGFILE-CLOSE.                                         
           PERFORM 9400-TXNFILEX-CLOSE.                                         
                                                                                
           DISPLAY 'END OF EXECUTION OF PROGRAM LXB002C'.                      
                                                                                
           GOBACK.                                                              
      *---------------------------------------------------------------*         
       0000-BALCATF-OPEN.                                                      
           MOVE 8 TO APPL-RESULT.                                               
           OPEN INPUT BALCAT-FILE                                              
           IF  BALCATF-STATUS = '00'                                           
               MOVE 0 TO APPL-RESULT                                            
           ELSE                                                                 
               MOVE 12 TO APPL-RESULT                                           
           END-IF                                                               
           IF  APPL-AOK                                                         
               CONTINUE                                                         
           ELSE                                                                 
               DISPLAY 'ERROR OPENING TRANSACTION CATEGORY BALANCE'             
               MOVE BALCATF-STATUS TO IO-STATUS                                
               PERFORM 9910-DISPLAY-IO-STATUS                                   
               PERFORM 9999-ABEND-PROGRAM                                       
           END-IF                                                               
           EXIT.                                                                
      *---------------------------------------------------------------*         
       0100-LINKFILE-OPEN.                                                      
           MOVE 8 TO APPL-RESULT.                                               
           OPEN INPUT LINK-FILE                                                 
           IF  LINKFILE-STATUS = '00'                                           
               MOVE 0 TO APPL-RESULT                                            
           ELSE                                                                 
               MOVE 12 TO APPL-RESULT                                           
           END-IF                                                               
           IF  APPL-AOK                                                         
               CONTINUE                                                         
           ELSE                                                                 
               DISPLAY 'ERROR OPENING CROSS REF FILE'   LINKFILE-STATUS         
               MOVE LINKFILE-STATUS TO IO-STATUS                                
               PERFORM 9910-DISPLAY-IO-STATUS                                   
               PERFORM 9999-ABEND-PROGRAM                                       
           END-IF                                                               
           EXIT.                                                                
      *---------------------------------------------------------------*         
       0200-RATEGRP-OPEN.                                                       
           MOVE 8 TO APPL-RESULT.                                               
           OPEN INPUT RATEGRP-FILE                                              
           IF  RATEGRP-STATUS = '00'                                            
               MOVE 0 TO APPL-RESULT                                            
           ELSE                                                                 
               MOVE 12 TO APPL-RESULT                                           
           END-IF                                                               
           IF  APPL-AOK                                                         
               CONTINUE                                                         
           ELSE                                                                 
               DISPLAY 'ERROR OPENING DALY REJECTS FILE'                        
               MOVE RATEGRP-STATUS TO IO-STATUS                                 
               PERFORM 9910-DISPLAY-IO-STATUS                                   
               PERFORM 9999-ABEND-PROGRAM                                       
           END-IF                                                               
           EXIT.                                                                
                                                                                
      *---------------------------------------------------------------*         
       0300-LEDGFILE-OPEN.                                                      
           MOVE 8 TO APPL-RESULT.                                               
           OPEN I-O ACCOUNT-FILE                                                
           IF  LEDGFILE-STATUS = '00'                                           
               MOVE 0 TO APPL-RESULT                                            
           ELSE                                                                 
               MOVE 12 TO APPL-RESULT                                           
           END-IF                                                               
           IF  APPL-AOK                                                         
               CONTINUE                                                         
           ELSE                                                                 
               DISPLAY 'ERROR OPENING ACCOUNT MASTER FILE'                      
               MOVE LEDGFILE-STATUS TO IO-STATUS                                
               PERFORM 9910-DISPLAY-IO-STATUS                                   
               PERFORM 9999-ABEND-PROGRAM                                       
           END-IF                                                               
           EXIT.                                                                
      *---------------------------------------------------------------*         
       0400-TXNFILEX-OPEN.                                                      
           MOVE 8 TO APPL-RESULT.                                               
           OPEN OUTPUT TXNFILE-FILE                                            
           IF  TXNFILEX-STATUS = '00'                                           
               MOVE 0 TO APPL-RESULT                                            
           ELSE                                                                 
               MOVE 12 TO APPL-RESULT                                           
           END-IF                                                               
           IF  APPL-AOK                                                         
               CONTINUE                                                         
           ELSE                                                                 
               DISPLAY 'ERROR OPENING TRANSACTION FILE'                         
               MOVE TXNFILEX-STATUS TO IO-STATUS                                
               PERFORM 9910-DISPLAY-IO-STATUS                                   
               PERFORM 9999-ABEND-PROGRAM                                       
           END-IF                                                               
           EXIT.                                                                
      *---------------------------------------------------------------*         
       1000-BALCATF-GET-NEXT.                                                  
           READ BALCAT-FILE INTO TXN-CAT-BAL-RECORD.                          
           IF  BALCATF-STATUS  = '00'                                          
               MOVE 0 TO APPL-RESULT                                            
           ELSE                                                                 
               IF  BALCATF-STATUS  = '10'                                      
                   MOVE 16 TO APPL-RESULT                                       
               ELSE                                                             
                   MOVE 12 TO APPL-RESULT                                       
               END-IF                                                           
           END-IF                                                               
           IF  APPL-AOK                                                         
               CONTINUE                                                         
           ELSE                                                                 
               IF  APPL-EOF                                                     
                   MOVE 'Y' TO END-OF-FILE                                      
               ELSE                                                             
                   DISPLAY 'ERROR READING TRANSACTION CATEGORY FILE'            
                   MOVE BALCATF-STATUS TO IO-STATUS                            
                   PERFORM 9910-DISPLAY-IO-STATUS                               
                   PERFORM 9999-ABEND-PROGRAM                                   
               END-IF                                                           
           END-IF                                                               
           EXIT.                                                                
      *---------------------------------------------------------------*         
       1050-UPDATE-ACCOUNT.                                                     
      * Update the balances in account record to reflect posted trans.          
           ADD WS-TOTAL-INT  TO LACC-CURR-BAL                                   
           MOVE 0 TO LACC-CURR-CYC-CREDIT                                       
           MOVE 0 TO LACC-CURR-CYC-DEBIT                                        
                                                                                
           REWRITE FD-LEDGFILE-REC FROM  ACCOUNT-RECORD                         
           IF  LEDGFILE-STATUS  = '00'                                          
               MOVE 0 TO APPL-RESULT                                            
           ELSE                                                                 
               MOVE 12 TO APPL-RESULT                                           
           END-IF                                                               
           IF  APPL-AOK                                                         
               CONTINUE                                                         
           ELSE                                                                 
               DISPLAY 'ERROR RE-WRITING ACCOUNT FILE'                          
               MOVE LEDGFILE-STATUS  TO IO-STATUS                               
               PERFORM 9910-DISPLAY-IO-STATUS                                   
               PERFORM 9999-ABEND-PROGRAM                                       
           END-IF                                                               
           EXIT.                                                                
      *---------------------------------------------------------------*         
       1100-GET-LACC-DATA.                                                      
           READ ACCOUNT-FILE INTO ACCOUNT-RECORD                                
               INVALID KEY                                                      
                  DISPLAY 'ACCOUNT NOT FOUND: ' FD-LACC-ID                      
           END-READ                                                             
                                                                                
           IF  LEDGFILE-STATUS  = '00'                                          
               MOVE 0 TO APPL-RESULT                                            
           ELSE                                                                 
               MOVE 12 TO APPL-RESULT                                           
           END-IF                                                               
           IF  APPL-AOK                                                         
               CONTINUE                                                         
           ELSE                                                                 
               DISPLAY 'ERROR READING ACCOUNT FILE'                             
               MOVE LEDGFILE-STATUS  TO IO-STATUS                               
               PERFORM 9910-DISPLAY-IO-STATUS                                   
               PERFORM 9999-ABEND-PROGRAM                                       
           END-IF                                                               
           EXIT.                                                                
      *---------------------------------------------------------------*         
       1110-GET-LINK-DATA.                                                      
           READ LINK-FILE INTO CRD-LINK-RECORD                                 
            KEY IS FD-LINK-LACC-ID                                              
               INVALID KEY                                                      
                  DISPLAY 'ACCOUNT NOT FOUND: ' FD-LINK-LACC-ID                 
           END-READ                                                             
                                                                                
           IF  LINKFILE-STATUS   = '00'                                         
               MOVE 0 TO APPL-RESULT                                            
           ELSE                                                                 
               MOVE 12 TO APPL-RESULT                                           
           END-IF                                                               
           IF  APPL-AOK                                                         
               CONTINUE                                                         
           ELSE                                                                 
               DISPLAY 'ERROR READING XREF FILE'                                
               MOVE LINKFILE-STATUS  TO IO-STATUS                               
               PERFORM 9910-DISPLAY-IO-STATUS                                   
               PERFORM 9999-ABEND-PROGRAM                                       
           END-IF                                                               
           EXIT.                                                                
      *---------------------------------------------------------------*         
       1200-GET-INTEREST-RATE.                                                  
           READ RATEGRP-FILE INTO RG-GROUP-RECORD                              
                INVALID KEY                                                     
                   DISPLAY 'DISCLOSURE GROUP RECORD MISSING'                    
                   DISPLAY 'TRY WITH STANDARD GROUP CODE'                        
           END-READ.                                                            
                                                                                
           IF  RATEGRP-STATUS  = '00'  OR '23'                                  
               MOVE 0 TO APPL-RESULT                                            
           ELSE                                                                 
               MOVE 12 TO APPL-RESULT                                           
           END-IF                                                               
                                                                                
           IF  APPL-AOK                                                         
               CONTINUE                                                         
           ELSE                                                                 
               DISPLAY 'ERROR READING DISCLOSURE GROUP FILE'                    
               MOVE RATEGRP-STATUS  TO IO-STATUS                                
               PERFORM 9910-DISPLAY-IO-STATUS                                   
               PERFORM 9999-ABEND-PROGRAM                                       
           END-IF                                                               
           IF  RATEGRP-STATUS  = '23'                                           
               MOVE 'STANDARD' TO FD-RG-LACC-GROUP-ID                           
               PERFORM 1200-A-GET-STANDARD-INT-RATE                              
           END-IF                                                               
           EXIT.                                                                
                                                                                
      *---------------------------------------------------------------*         
       1200-A-GET-STANDARD-INT-RATE.                                             
           READ RATEGRP-FILE INTO RG-GROUP-RECORD                              
                                                                                
           IF  RATEGRP-STATUS  = '00'                                           
               MOVE 0 TO APPL-RESULT                                            
           ELSE                                                                 
               MOVE 12 TO APPL-RESULT                                           
           END-IF                                                               
                                                                                
           IF  APPL-AOK                                                         
               CONTINUE                                                         
           ELSE                                                                 
               DISPLAY 'ERROR READING STANDARD DISCLOSURE GROUP'                 
               MOVE RATEGRP-STATUS  TO IO-STATUS                                
               PERFORM 9910-DISPLAY-IO-STATUS                                   
               PERFORM 9999-ABEND-PROGRAM                                       
           END-IF                                                               
           EXIT.                                                                
      *---------------------------------------------------------------*         
       1300-COMPUTE-INTEREST.                                                   
                                                                                
           COMPUTE WS-MONTHLY-INT                                               
            = ( TXN-CAT-BAL * RG-INT-RATE) / 1200                             
                                                                                
           ADD WS-MONTHLY-INT  TO WS-TOTAL-INT                                  
           PERFORM 1300-B-WRITE-TX.                                             
                                                                                
           EXIT.                                                                
                                                                                
      *---------------------------------------------------------------*         
       1300-B-WRITE-TX.                                                         
           ADD 1 TO WS-TRANID-SUFFIX                                            
                                                                                
           STRING PARM-DATE,                                                    
                  WS-TRANID-SUFFIX                                              
             DELIMITED BY SIZE                                                  
             INTO TXN-ID                                                       
           END-STRING.                                                          
                                                                                
           MOVE '07'                 TO TXN-TYPE-CD                            
           MOVE '12'                 TO TXN-CAT-CD                             
           MOVE 'Batch'              TO TXN-SOURCE                             
           STRING 'Accrued int ' ,                                             
                  LACC-ID                                                       
                  DELIMITED BY SIZE                                             
            INTO TXN-DESC                                                      
           END-STRING                                                           
           MOVE WS-MONTHLY-INT       TO TXN-AMT                                
           MOVE 0                    TO TXN-MERCHANT-ID                        
           MOVE SPACES               TO TXN-MERCHANT-NAME                      
           MOVE SPACES               TO TXN-MERCHANT-CITY                      
           MOVE SPACES               TO TXN-MERCHANT-ZIP                       
           MOVE LINK-CRD-NUM        TO TXN-CRD-NUM                           
           PERFORM Z-GET-DB2-FORMAT-TIMESTAMP                                   
           MOVE DB2-FORMAT-TS        TO TXN-ORIG-TS                            
           MOVE DB2-FORMAT-TS        TO TXN-PROC-TS                            
                                                                                
           WRITE FD-TXNFILEX-REC FROM TXN-RECORD                               
           IF  TXNFILEX-STATUS   = '00'                                         
               MOVE 0 TO APPL-RESULT                                            
           ELSE                                                                 
               MOVE 12 TO APPL-RESULT                                           
           END-IF                                                               
                                                                                
           IF  APPL-AOK                                                         
               CONTINUE                                                         
           ELSE                                                                 
               DISPLAY 'ERROR WRITING TRANSACTION RECORD'                       
               MOVE TXNFILEX-STATUS   TO IO-STATUS                              
               PERFORM 9910-DISPLAY-IO-STATUS                                   
               PERFORM 9999-ABEND-PROGRAM                                       
           END-IF                                                               
           EXIT.                                                                
                                                                                
      *---------------------------------------------------------------*         
       1400-COMPUTE-FEES.                                                       
      * To be implemented                                                       
           EXIT.                                                                
      *---------------------------------------------------------------*         
       9000-BALCATF-CLOSE.                                                     
           MOVE 8 TO  APPL-RESULT.                                              
           CLOSE BALCAT-FILE                                                   
           IF  BALCATF-STATUS = '00'                                           
               MOVE 0 TO  APPL-RESULT                                           
           ELSE                                                                 
               MOVE 12 TO APPL-RESULT                                           
           END-IF                                                               
           IF  APPL-AOK                                                         
               CONTINUE                                                         
           ELSE                                                                 
               DISPLAY 'ERROR CLOSING TRANSACTION BALANCE FILE'                 
               MOVE BALCATF-STATUS  TO IO-STATUS                               
               PERFORM 9910-DISPLAY-IO-STATUS                                   
               PERFORM 9999-ABEND-PROGRAM                                       
           END-IF                                                               
           EXIT.                                                                
                                                                                
      *---------------------------------------------------------------*         
       9100-LINKFILE-CLOSE.                                                     
           MOVE 8 TO APPL-RESULT.                                               
           CLOSE LINK-FILE                                                      
           IF  LINKFILE-STATUS = '00'                                           
               MOVE 0 TO APPL-RESULT                                            
           ELSE                                                                 
               MOVE 12 TO APPL-RESULT                                           
           END-IF                                                               
           IF  APPL-AOK                                                         
               CONTINUE                                                         
           ELSE                                                                 
               DISPLAY 'ERROR CLOSING CROSS REF FILE'                           
               MOVE LINKFILE-STATUS TO IO-STATUS                                
               PERFORM 9910-DISPLAY-IO-STATUS                                   
               PERFORM 9999-ABEND-PROGRAM                                       
           END-IF                                                               
           EXIT.                                                                
      *---------------------------------------------------------------*         
       9200-RATEGRP-CLOSE.                                                      
           MOVE 8 TO APPL-RESULT.                                               
           CLOSE RATEGRP-FILE                                                   
           IF  RATEGRP-STATUS = '00'                                            
               MOVE 0 TO APPL-RESULT                                            
           ELSE                                                                 
               MOVE 12 TO APPL-RESULT                                           
           END-IF                                                               
           IF  APPL-AOK                                                         
               CONTINUE                                                         
           ELSE                                                                 
               DISPLAY 'ERROR CLOSING DISCLOSURE GROUP FILE'                    
               MOVE RATEGRP-STATUS TO IO-STATUS                                 
               PERFORM 9910-DISPLAY-IO-STATUS                                   
               PERFORM 9999-ABEND-PROGRAM                                       
           END-IF                                                               
           EXIT.                                                                
      *---------------------------------------------------------------*         
       9300-LEDGFILE-CLOSE.                                                     
           MOVE 8 TO APPL-RESULT.                                               
           CLOSE ACCOUNT-FILE                                                   
           IF  LEDGFILE-STATUS  = '00'                                          
               MOVE 0 TO APPL-RESULT                                            
           ELSE                                                                 
               MOVE 12 TO APPL-RESULT                                           
           END-IF                                                               
           IF  APPL-AOK                                                         
               CONTINUE                                                         
           ELSE                                                                 
               DISPLAY 'ERROR CLOSING ACCOUNT FILE'                             
               MOVE LEDGFILE-STATUS  TO IO-STATUS                               
               PERFORM 9910-DISPLAY-IO-STATUS                                   
               PERFORM 9999-ABEND-PROGRAM                                       
           END-IF                                                               
           EXIT.                                                                
                                                                                
       9400-TXNFILEX-CLOSE.                                                     
           MOVE 8 TO APPL-RESULT.                                               
           CLOSE TXNFILE-FILE                                                  
           IF  TXNFILEX-STATUS  = '00'                                          
               MOVE 0 TO APPL-RESULT                                            
           ELSE                                                                 
               MOVE 12 TO APPL-RESULT                                           
           END-IF                                                               
           IF  APPL-AOK                                                         
               CONTINUE                                                         
           ELSE                                                                 
               DISPLAY 'ERROR CLOSING TRANSACTION FILE'                         
               MOVE TXNFILEX-STATUS  TO IO-STATUS                               
               PERFORM 9910-DISPLAY-IO-STATUS                                   
               PERFORM 9999-ABEND-PROGRAM                                       
           END-IF                                                               
           EXIT.                                                                
                                                                                
       Z-GET-DB2-FORMAT-TIMESTAMP.                                              
           MOVE FUNCTION CURRENT-DATE TO COBOL-TS                               
           MOVE COB-YYYY TO DB2-YYYY                                            
           MOVE COB-MM   TO DB2-MM                                              
           MOVE COB-DD   TO DB2-DD                                              
           MOVE COB-HH   TO DB2-HH                                              
           MOVE COB-MIN  TO DB2-MIN                                             
           MOVE COB-SS   TO DB2-SS                                              
           MOVE COB-MIL  TO DB2-MIL                                             
           MOVE '0000'   TO DB2-REST                                            
           MOVE '-' TO DB2-STREEP-1 DB2-STREEP-2 DB2-STREEP-3                   
           MOVE '.' TO DB2-DOT-1 DB2-DOT-2 DB2-DOT-3                            
      *    DISPLAY 'DB2-TIMESTAMP = ' DB2-FORMAT-TS                             
           EXIT.                                                                
                                                                                
       9999-ABEND-PROGRAM.                                                      
           DISPLAY 'ABENDING PROGRAM'                                           
           MOVE 0 TO TIMING                                                     
           MOVE 999 TO ABCODE                                                   
           CALL 'LXZ009D' USING ABCODE, TIMING.                                 
                                                                                
      *****************************************************************         
       9910-DISPLAY-IO-STATUS.                                                  
           IF  IO-STATUS NOT NUMERIC                                            
           OR  IO-STAT1 = '9'                                                   
               MOVE IO-STAT1 TO IO-STATUS-04(1:1)                               
               MOVE 0        TO TWO-BYTES-BINARY                                
               MOVE IO-STAT2 TO TWO-BYTES-RIGHT                                 
               MOVE TWO-BYTES-BINARY TO IO-STATUS-0403                          
               DISPLAY 'FILE STATUS IS: NNNN' IO-STATUS-04                      
           ELSE                                                                 
               MOVE '0000' TO IO-STATUS-04                                      
               MOVE IO-STATUS TO IO-STATUS-04(3:2)                              
               DISPLAY 'FILE STATUS IS: NNNN' IO-STATUS-04                      
           END-IF                                                               
           EXIT.                                                                
                                                                                
      *
      * Ver: Ledgerline_v2.0-25-gdb72e6b-235 Date: 2025-04-29 11:01:28 CDT
      *
