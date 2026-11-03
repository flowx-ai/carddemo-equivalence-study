# Workflow: PostDailyTransactions

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6adf374b16836599f39460f2 | <uuid> | (0, 0) | → Calculate posting (seq:<uuid>) |
| Return posting results | END | 6adf374b16836599f39460f3 | <uuid> | (1200, 0) | — |
| Calculate posting | SCRIPT | 6adf374b16836599f39460f4 | <uuid> | (300, 0) | → Draft assumptions (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions | AI | 6adf374b16836599f39460f5 | <uuid> | (600, 0) | → Assemble results [SUCCESS] (seq:<uuid>), → Draft assumptions failed [FAIL] (seq:<uuid>) | responseKey: draftedAssumptions, aiType: TEXT_UNDERSTANDING, responseSchema: set |
| Assemble results | SCRIPT | 6adf374b16836599f39460f6 | <uuid> | (900, 0) | → Return posting results (seq:<uuid>) | lang: JAVASCRIPT |
| Draft assumptions failed | SCRIPT | 6adf374b16836599f39460f7 | <uuid> | (600, 200) | → Assemble results (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## AI prompts

### Draft assumptions (TEXT_UNDERSTANDING, id=6adf374b16836599f39460f5)
instructions:

```
Explain only the supplied assumption evidence. Return one entries element per input entry in exactly the input order, copying whatAssumed and wikiBasis verbatim so no decision or source changes. Draft a readable Markdown table using those entries, with columns What you assumed and Which wiki statement (or absence of one) it rests on. Do not add sources, use outside knowledge, infer additional rules or change financial data. Return entries and markdown as the supplied schema specifies.
```
userMessage:

```
${assumptionEvidence}
```
exampleOutputJsonSchema:

```
{"title":"Response","type":"object","additionalProperties":false,"required":["entries","markdown"],"properties":{"entries":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["whatAssumed","wikiBasis"],"properties":{"whatAssumed":{"type":"string"},"wikiBasis":{"type":"string"}}}},"markdown":{"type":"string"}}}
```

## Scripts

### Calculate posting (SCRIPT, id=6adf374b16836599f39460f4)

```javascript
var evidence=[]; function assumption(a,b){evidence.push({whatAssumed:a,wikiBasis:b});}
assumption('Receive all nine named input files as caller-supplied text and return datasets and this report as data, not physical files.','posttran-sonnet.pdf p.27: "One JSON file per output: a list of objects, in any order." Maker selected data-only delivery because generated-file delivery is unavailable.');
assumption('Decode consecutive fields in data-table order, with trailing filler of 178 account, 14 xref, 20 transaction and 22 category bytes; FlowX-only daily attributes are not encoded in legacy records. Layout parity remains unverified without full copybooks.','posttran-sonnet.pdf p.7: "Legacy FILLER (178 bytes) is dropped"; p.9–11 list fields and widths; p.11: "Same attributes as Transaction"; p.27 names copybooks but does not provide their complete offsets.');
assumption('Signed monetary fields occupy their declared digit count with implied two decimal places; accept digits or ASCII trailing overpunch {ABCDEFGHI / }JKLMNOPQR, compute in integer cents and emit two-decimal strings. Use S9(9)V99 width 11 despite the inconsistent amount example.','posttran-sonnet.pdf p.9: "amount Number (2 dec)" and "S9(9)V99"; its displayed example has a different digit capacity; p.10 describes signed overpunch for disclosure data, not posting input encoding; p.27 permits amount strings or numbers with at most two decimals.');
assumption('Accept LF or CRLF and one terminal line ending; an empty supplied file has no records, while missing files, wrong widths, non-ASCII data, invalid numeric/date fields and duplicate business keys fail the calculation with no partial datasets.','posttran-sonnet.pdf p.27: "one record per line, fixed width"; framing, malformed-data handling and duplicate snapshot keys are otherwise unspecified.');
assumption('Missing card stops validation with 100; missing referenced account stops with 101; with an account present, expiry 103 overwrites overlimit 102. Equality on limit or expiry passes.','posttran-sonnet.pdf p.3 BR-01–04 and p.4: "Validation order xref → account → limit → expiry"; p.4 invalid-card-plus-expiry example cannot be evaluated without a referenced account; BR-03 uses > and BR-04 uses <.');
assumption('Preserve feed transaction identifiers, reject duplicate feed identifiers as a fatal input error, and do not allocate a database sequence.','posttran-sonnet.pdf p.23: "the new id is allocated by a sequence"; p.27 supplies neither existing transaction records nor sequence state.');
assumption('Use a supplied run timestamp, otherwise current UTC time, formatted YYYY-MM-DD HH:mm:ss.ffffff with millisecond precision padded to six fractional digits. Preserve rejected records\' original processing timestamps.','posttran-sonnet.pdf p.3 BR-05: "processedTimestamp = now"; p.10 specifies X(26) timestamps but no timezone or fractional precision; p.3 BR-06 requires the original rejected image.');
assumption('Work on copied snapshots; a replay must start from original snapshots, with the same supplied timestamp for identical results. There is no durable restart, database rewrite failure or reason-109 reject in this calculation.','posttran-sonnet.pdf p.3 BR-08: "Reason 109 (account rewrite failure) aborts the record and is not written to rejects"; BR-09 proposes a processed-index restart, but the selected data-only scope has no persistent store.');
assumption('Read and check the widths of every supplied file but decode only daily transactions, accounts, xrefs and category balances; do not add active-status, type/category-reference or card-record validation.','posttran-sonnet.pdf p.3 BR-01–05 enumerate posting checks; p.27 lists the additional chain input files but specifies no additional POSTTRAN rules for them.');
assumption('Use numeric account and category identifiers in category output like their corresponding contract fields, retain zero-padded strings internally, trim only trailing spaces, allow blank optional reissue dates and incoming processing timestamps, and accept ISO original dates/timestamps.','posttran-sonnet.pdf p.27 explicitly marks account acct_id and transaction cat_cd as int, but does not type category-output keys separately; p.7 makes reissueDate optional; p.10 lists timestamps without a complete encoding rule.');
assumption('A valid empty feed returns OK/0 and unchanged snapshots; any reject returns WARNING/4; malformed input or field overflow returns ERROR/12 with empty result datasets and zero result counts.','posttran-sonnet.pdf p.3 BR-07 specifies warning return code 4 and p.5 says "read = posted + rejected"; no empty-feed return code or malformed-input return code is prescribed. ERROR/12 is an explicit implementation default.');
assumption('Only a model drafts the report presentation; canonical assumption entries cannot change, and failed or invalid drafting falls back to a deterministic table with failure disclosed.','The maker requires each assumption and its wiki basis; the wiki specifies no report-generation mechanism. This is the confirmed explanation-only design, not posting behaviour.');
function fail(s){throw new Error(s);} function int(s){if(!/^\d+$/.test(s))fail('Invalid digits');var n=Number(s);if(!Number.isSafeInteger(n))fail('Integer overflow');return n;}
function cents(s){var last=s.slice(-1),p='{ABCDEFGHI',n='}JKLMNOPQR',sgn=1,ix=p.indexOf(last);if(ix>=0)s=s.slice(0,-1)+ix;else{ix=n.indexOf(last);if(ix>=0){s=s.slice(0,-1)+ix;sgn=-1;}}return sgn*int(s);}
function plus(a,b,w){var v=a+b;if(!Number.isSafeInteger(v)||Math.abs(v)>Math.pow(10,w)-1)fail('Monetary field overflow');return v;}
function amount(v){return (v<0?'-':'')+Math.floor(Math.abs(v)/100)+'.'+String(Math.abs(v)%100).padStart(2,'0');}
function date(s,optional){if(optional&&s==='')return s;if(!/^\d{4}-\d{2}-\d{2}$/.test(s))fail('Invalid date');var d=new Date(s+'T00:00:00Z');if(isNaN(d.getTime())||d.toISOString().slice(0,10)!==s)fail('Invalid calendar date');return s;}
function text(s){return s.replace(/ +$/,'');}
function parse(line,spec){var o={},at=0;spec.split(',').forEach(function(f){var a=f.split(':'),w=Number(a[1]),v=line.slice(at,at+w);at+=w;o[a[0]]=a[2]==='m'?cents(v):a[2]==='i'?int(v):a[2]==='k'?(int(v),v):text(v);});return o;}
var result={status:'ERROR',returnCode:12,readCount:0,postedCount:0,rejectedCount:0,error:'',posttran_transact:[],posttran_dalyrejs:[],posttran_acctdata:[],posttran_tcatbal:[]};
try{
 var files=input.files||{},widths={'dailytran.dat':350,'acctdata.dat':300,'cardxref.dat':50,'tcatbal.dat':50,'discgrp.dat':50,'custdata.dat':500,'carddata.dat':150,'trantype.dat':60,'trancatg.dat':60},lines={};
 Object.keys(widths).forEach(function(k){if(typeof files[k]!=='string')fail('Missing file contents: '+k);var s=files[k];if(/[^\x00-\x7F]/.test(s))fail('Non-ASCII input: '+k);var a=s===''?[]:s.split(/\r?\n/);if(a.length&&a[a.length-1]==='')a.pop();a.forEach(function(r,i){if(r.length!==widths[k])fail('Wrong record width: '+k+' line '+(i+1));});lines[k]=a;});
 date(input.businessDate||'2022-07-18',false);var timestamp;if(input.runTimestamp){var raw=String(input.runTimestamp),d=new Date(raw.replace(' ','T')+(raw.indexOf('Z')<0&&!/[+-]\d{2}:\d{2}$/.test(raw)?'Z':''));if(isNaN(d.getTime()))fail('Invalid run timestamp');timestamp=d.toISOString().replace('T',' ').replace('Z','000');}else timestamp=new Date().toISOString().replace('T',' ').replace('Z','000');
 var as='acct_id:11:k,active_status:1:s,curr_bal:12:m,credit_limit:12:m,cash_credit_limit:12:m,open_date:10:s,expiration_date:10:s,reissue_date:10:s,curr_cyc_credit:12:m,curr_cyc_debit:12:m,addr_zip:10:s,group_id:10:s';
 var ts='tran_id:16:s,type_cd:2:s,cat_cd:4:i,source:10:s,desc:100:s,amt:11:m,merchant_id:9:i,merchant_name:50:s,merchant_city:50:s,merchant_zip:10:s,card_num:16:k,orig_ts:26:s,proc_ts:26:s';
 var cs='acct_id:11:k,type_cd:2:s,cat_cd:4:i,bal:11:m',xs='card_num:16:k,customer:9:k,acct_id:11:k';
 var accounts=[],ac=Object.create(null),xref=Object.create(null),categories=[],cat=Object.create(null),ids=Object.create(null),posted=[],rejected=[];
 lines['acctdata.dat'].forEach(function(r){var a=parse(r,as);if(ac[a.acct_id])fail('Duplicate account');date(a.open_date,false);date(a.expiration_date,false);date(a.reissue_date,true);ac[a.acct_id]=a;accounts.push(a);});
 lines['cardxref.dat'].forEach(function(r){var x=parse(r,xs);if(xref[x.card_num])fail('Duplicate card xref');xref[x.card_num]=x;});
 function ck(a,t,c){return a+'|'+t+'|'+c;}
 lines['tcatbal.dat'].forEach(function(r){var c=parse(r,cs),k=ck(c.acct_id,c.type_cd,c.cat_cd);if(cat[k])fail('Duplicate category balance');cat[k]=c;categories.push(c);});
 function tran(t){var c=Object.assign({},t);c.amt=amount(t.amt);return c;}
 lines['dailytran.dat'].forEach(function(r){var t=parse(r,ts);if(!t.tran_id||ids[t.tran_id])fail('Blank or duplicate transaction id');ids[t.tran_id]=true;var od=t.orig_ts.slice(0,10);date(od,false);if(!/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z?)?$/.test(t.orig_ts))fail('Invalid original timestamp');var reason=0,desc='',x=xref[t.card_num],a=x?ac[x.acct_id]:null;
 if(!x){reason=100;desc='INVALID CARD NUMBER FOUND';}else if(!a){reason=101;desc='ACCOUNT RECORD NOT FOUND';}else{var exposure=a.curr_cyc_credit-a.curr_cyc_debit+t.amt;if(!Number.isSafeInteger(exposure))fail('Exposure overflow');if(exposure>a.credit_limit){reason=102;desc='OVERLIMIT TRANSACTION';}if(a.expiration_date<od){reason=103;desc='TRANSACTION RECEIVED AFTER ACCT EXPIRATION';}}
 if(reason){var rej=tran(t);rej.reason=reason;rej.reason_desc=desc;rejected.push(rej);}else{var key=ck(a.acct_id,t.type_cd,t.cat_cd),c=cat[key];if(!c){c={acct_id:a.acct_id,type_cd:t.type_cd,cat_cd:t.cat_cd,bal:0};cat[key]=c;categories.push(c);}c.bal=plus(c.bal,t.amt,11);a.curr_bal=plus(a.curr_bal,t.amt,12);if(t.amt>=0)a.curr_cyc_credit=plus(a.curr_cyc_credit,t.amt,12);else a.curr_cyc_debit=plus(a.curr_cyc_debit,t.amt,12);t.proc_ts=timestamp;posted.push(tran(t));}
 });
 var ao=accounts.map(function(a){var c=Object.assign({},a);c.acct_id=int(a.acct_id);['curr_bal','credit_limit','cash_credit_limit','curr_cyc_credit','curr_cyc_debit'].forEach(function(k){c[k]=amount(a[k]);});return c;});var co=categories.map(function(c){return {acct_id:int(c.acct_id),type_cd:c.type_cd,cat_cd:c.cat_cd,bal:amount(c.bal)};});
 result={status:rejected.length?'WARNING':'OK',returnCode:rejected.length?4:0,readCount:posted.length+rejected.length,postedCount:posted.length,rejectedCount:rejected.length,error:'',posttran_transact:posted,posttran_dalyrejs:rejected,posttran_acctdata:ao,posttran_tcatbal:co};
}catch(e){result.error=String(e.message||e);}
output={calculatedPosting:result,assumptionEvidence:evidence};
```

### Assemble results (SCRIPT, id=6adf374b16836599f39460f6)

```javascript
var src=Array.isArray(input.assumptionEvidence)?input.assumptionEvidence:[];var draft=input.draftedAssumptions||{};var valid=Array.isArray(draft.entries)&&draft.entries.length===src.length&&typeof draft.markdown==='string'&&draft.markdown.length>0;for(var i=0;valid&&i<src.length;i++){valid=draft.entries[i].whatAssumed===src[i].whatAssumed&&draft.entries[i].wikiBasis===src[i].wikiBasis;}function esc(s){return String(s).replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');}var canonical='| What you assumed | Which wiki statement (or absence of one) it rests on |\n| --- | --- |\n'+src.map(function(e){return '| '+esc(e.whatAssumed)+' | '+esc(e.wikiBasis)+' |';}).join('\n');if(valid){for(var j=0;j<src.length;j++){if(draft.markdown.indexOf(esc(src[j].whatAssumed))<0||draft.markdown.indexOf(esc(src[j].wikiBasis))<0){valid=false;break;}}if(draft.markdown.trim()!==canonical.trim())valid=false;}var r=Object.assign({},input.calculatedPosting||{status:'ERROR',returnCode:12,readCount:0,postedCount:0,rejectedCount:0,error:'No calculation result',posttran_transact:[],posttran_dalyrejs:[],posttran_acctdata:[],posttran_tcatbal:[]});r.assumptions={entries:src,markdown:valid?draft.markdown:canonical};r.assumptionsDraftFailed=!valid;output={postingResult:r};
```

### Draft assumptions failed (SCRIPT, id=6adf374b16836599f39460f7)

```javascript
output = {"draftedAssumptions": {}};

```

_(server: 248 ms, 1 API call, 241 ms in API)_
