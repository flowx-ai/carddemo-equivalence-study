# Workflow: CalculateCardDemoInterest

- **Resource ID:** <uuid>
- **Resource Definition ID:** <uuid>
- **Type:** DEFAULT
- **Description:** 

## Nodes
| Name | Type | ID | FlowxUuid | Position | Sequences |
|------|------|----|-----------|----------|-----------|
| Start | START | 6ae540293695c563ea5154b2 | <uuid> | (0, 0) | → Transform (seq:<uuid>) |
| End | END | 6ae5402a3695c563ea5154b3 | <uuid> | (600, 0) | — |
| Transform | SCRIPT | 6ae5402a3695c563ea5154b4 | <uuid> | (300, 0) | → End (seq:<uuid>) | lang: JAVASCRIPT |

## Systems
_(none)_

## Scripts

### Transform (SCRIPT, id=6ae5402a3695c563ea5154b4)

```javascript
var assumptions = [];
function note(assumption, wikiBasis) { assumptions.push({assumption: assumption, wikiBasis: wikiBasis}); }
var p2 = 'intcalc-opus.pdf p.2';
var p4 = 'intcalc-opus.pdf p.4';
var pc = 'intcalc-opus.pdf pp.10-11 (CONTRACT.md)';
note('The calculation receives decoded accounts, disclosureGroups and cardXrefs; fixed-width decoding and physical file I/O belong to the excluded adapter.', pc + ': copybooks are named but their complete byte layouts are not supplied. Maker selected the calculation-only scope.');
note('accounts contains POSTTRAN output accounts, not accounts from before transaction posting.', 'intcalc-opus.pdf p.10: step isolation supplies oracle POSTTRAN accounts and category balances.');
note('Each account is calculated independently using current balance, not category-balance subtotals.', p2 + ': interest = currentBalance x interestRate(groupId); exact grouping is marked TODO.');
note('disclosureGroups has group_id and rate; rate is a decimal multiplier, so 0.01 means one percent.', p2 + ': disclosure-group rates are named, but the rate record layout and units are absent.');
note('No annualisation, division by 100 or day-count adjustment is applied.', p2 + ': the stated formula is balance x rate; period conversion is absent and the exact formula is TODO.');
note('Compute using exact decimal integers; round interest once to cents, halfway away from zero.', p4 + ': rounding must match legacy but its rounding mode is explicitly unconfirmed. This is not a legacy-parity claim.');
note('Prefer decimal strings in inputs. JSON numbers use the decimal representation received by JavaScript; lost caller precision cannot be recovered.', pc + ': amounts may be strings or numbers; a calculation-core input precision policy is not stated.');
note('No account active-status filter is applied.', p2 + ': the pipeline says for each account; no eligibility filter is stated.');
note('Signed interest is retained, including negative interest.', p2 + ': multiplication is documented; negative-balance and negative-rate handling are not stated.');
note('Rounded zero interest emits no interest transaction and leaves current balance unchanged.', p4 + ': zero balance yields zero interest; whether a zero-value transaction is written is not stated.');
note('Add rounded interest only to curr_bal; preserve current-cycle credits, current-cycle debits and every other contracted account value.', p2 + ': add interest to balance; current-cycle total changes are not stated.');
note('Keep account input order and process duplicate account entries independently.', pc + ': output order is unrestricted; duplicate-account treatment is absent.');
note('Do not mutate caller input records.', pc + ': the contract defines returned accounts; in-memory mutation is not specified.');
note('Use transaction type_cd 01.', pc + ': required transaction field, but the interest transaction type value is absent.');
note('Use transaction cat_cd 0.', pc + ': category must be an integer; the interest category value is absent.');
note('Use source INTCALC.', pc + ': source is required; its interest-specific value is absent.');
note('Use description Interest calculation.', pc + ': desc is required; interest description wording is absent.');
note('Use merchant_id 0 and empty merchant_name, merchant_city and merchant_zip.', pc + ': merchant fields are required; values for system-generated interest are absent.');
note('Build tran_id as the ten-digit INTCALC parameter followed by the six-digit one-based account input position, including positions of skipped accounts.', 'intcalc-opus.pdf p.10 supplies parameter 2022071800 but no transaction identifier generation rule.');
note('Default businessDate to 2022-07-18 and intcalcParameter to 2022071800 only when absent.', 'intcalc-opus.pdf p.10 names these run parameters; defaults for a reusable calculation call are not specified.');
note('Set orig_ts and proc_ts to businessDate at midnight, YYYY-MM-DD HH:mm:ss.000000, with no timezone conversion.', pc + ': timestamps are required; population rules are absent. The model on p.5 describes 26-character timestamps.');
note('Use the lexicographically first card_num among cross-references matching acct_id.', 'intcalc-opus.pdf p.7 describes CardXref; the interest transaction card-selection policy is absent.');
note('When no card matches, emit an empty card_num and add an account-specific diagnostic.', pc + ': card_num is required, but missing-card handling for interest is absent.');
note('Match groups case-sensitively after removing trailing spaces; duplicate definitions make the entire group unusable.', pc + ': trailing spaces may be omitted. Group matching case and conflicting/duplicate reference handling are absent.');
note('Missing or invalid group rates leave only the affected account unchanged with no interest transaction and an account-specific diagnostic.', p2 + ': rate lookup is required, but a missing-rate fallback is absent.');
note('Malformed values needed for calculation, invalid run parameters, identifier overflow or monetary overflow leave the affected account unchanged and reported; other accounts continue.', p2 + ': record-error and overflow handling are absent. Only fields read by the calculation are validated.');
note('Valid account identifiers are retained as digit strings internally and converted to integers only for contracted acct_id output.', 'intcalc-opus.pdf pp.5, 10-11: account identifiers are 11 digits and output acct_id is an integer.');
note('Emit all monetary output values as two-decimal strings, with no negative zero.', pc + ': amounts may be strings or numbers with at most two decimals; representation and negative-zero policy are unspecified.');
note('Do not reject unused fields, filler bytes or unrelated input files.', pc + ': lists the chain inputs; the documented interest rule only reads accounts and group rates, with card references needed to populate card_num.');
note('No category-balance dataset is returned or persistently updated.', p2 + ' mentions category-balance posting, but ' + pc + ' defines no INTCALC category-balance output. This discrepancy is unresolved; the core follows the explicitly contracted output set.');
note('No state is persisted and no rerun deduplication is performed; identical decoded inputs in the same order and parameters yield identical results.', p2 + ': persistence is described for the full pipeline, not this maker-selected calculation-only scope; restart/idempotency rules are absent.');
note('The result members intcalc_systran, intcalc_acctdata and assumptions_md must be mapped by the adapter to the two named JSON files and assumptions.md next to them.', pc + ' defines the two INTCALC JSON files; the maker additionally requires assumptions.md. Physical file delivery is excluded by the maker-selected scope.');
function diagnostic(index, id, message) { note('Account input position ' + (index + 1) + ', acct_id ' + String(id) + ': ' + message, p2 + ': this record-specific condition has no documented handling; the preceding explicit fallback policy applies.'); }
function trimRight(v) { return String(v === null || v === undefined ? '' : v).replace(/ +$/, ''); }
function decimal(v) {
  if (typeof v !== 'string' && typeof v !== 'number') throw new Error('missing or nonnumeric value');
  var s = String(v).trim();
  var m = /^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(s);
  if (!m) throw new Error('invalid decimal');
  var exponent = m[4] ? Number(m[4]) : 0;
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 10000) throw new Error('unrepresentable decimal exponent');
  var fraction = m[3] || '';
  var digits = (m[2] + fraction).replace(/^0+(?=\d)/, '');
  var scale = fraction.length - exponent;
  if (scale < 0) { digits += new Array(1 - scale).join('0'); scale = 0; }
  return {n: BigInt((m[1] === '-' ? '-' : '') + digits), scale: scale};
}
function pow10(n) { return BigInt('1' + new Array(n + 1).join('0')); }
function centsExact(v) {
  var d = decimal(v);
  if (d.scale <= 2) return d.n * pow10(2 - d.scale);
  var divisor = pow10(d.scale - 2);
  if (d.n % divisor !== BigInt(0)) throw new Error('input monetary amount has fractional cents');
  return d.n / divisor;
}
function money(n) { var negative = n < BigInt(0); var s = (negative ? -n : n).toString(); while (s.length < 3) s = '0' + s; return (negative ? '-' : '') + s.slice(0, -2) + '.' + s.slice(-2); }
function accountKey(v) { var s = trimRight(v); if (!/^\d{1,11}$/.test(s)) throw new Error('invalid account identifier'); return s.replace(/^0+(?=\d)/, ''); }
function interestCents(balance, rate) {
  var n = balance * rate.n;
  var divisor = pow10(rate.scale);
  var negative = n < BigInt(0);
  var absolute = negative ? -n : n;
  var rounded = absolute / divisor;
  if ((absolute % divisor) * BigInt(2) >= divisor) rounded += BigInt(1);
  return negative ? -rounded : rounded;
}
function within(n, maximum) { return n <= maximum && n >= -maximum; }
var fields = ['acct_id','active_status','curr_bal','credit_limit','cash_credit_limit','open_date','expiration_date','reissue_date','curr_cyc_credit','curr_cyc_debit','addr_zip','group_id'];
var monetary = ['curr_bal','credit_limit','cash_credit_limit','curr_cyc_credit','curr_cyc_debit'];
var accounts = Array.isArray(input.accounts) ? input.accounts : [];
var groups = Array.isArray(input.disclosureGroups) ? input.disclosureGroups : [];
var cards = Array.isArray(input.cardXrefs) ? input.cardXrefs : [];
if (input.accounts !== undefined && !Array.isArray(input.accounts)) note('accounts is not an array; no account records were processed.', p2 + ': malformed call handling is absent.');
var rates = Object.create(null);
var invalidGroups = Object.create(null);
groups.forEach(function(g) {
  if (!g || typeof g !== 'object') return;
  var k = trimRight(g.group_id);
  if (Object.prototype.hasOwnProperty.call(rates, k) || Object.prototype.hasOwnProperty.call(invalidGroups, k)) { delete rates[k]; invalidGroups[k] = 'duplicate disclosure-group definition'; }
  else { try { rates[k] = decimal(g.rate); } catch (e) { invalidGroups[k] = 'invalid disclosure-group rate'; } }
});
var date = input.businessDate === undefined ? '2022-07-18' : String(input.businessDate);
var parameter = input.intcalcParameter === undefined ? '2022071800' : String(input.intcalcParameter);
var dateOK = /^\d{4}-\d{2}-\d{2}$/.test(date);
if (dateOK) { var parsedDate = new Date(date + 'T00:00:00.000Z'); dateOK = !isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0,10) === date; }
var runOK = dateOK && /^\d{10}$/.test(parameter);
var timestamp = date + ' 00:00:00.000000';
var transactions = [];
var updated = [];
accounts.forEach(function(record, index) {
  var a = record && typeof record === 'object' ? record : {};
  var copy = {};
  fields.forEach(function(f) { copy[f] = a[f] === undefined ? null : a[f]; });
  var id = a.acct_id;
  try { copy.acct_id = Number(accountKey(id)); } catch (ignored) {}
  monetary.forEach(function(f) { try { copy[f] = money(centsExact(a[f])); } catch (ignored) {} });
  updated.push(copy);
  try {
    var key = accountKey(id);
    if (!runOK) throw new Error('invalid business date or INTCALC parameter');
    if (index + 1 > 999999) throw new Error('transaction identifier sequence exceeds six digits');
    var group = trimRight(a.group_id);
    if (Object.prototype.hasOwnProperty.call(invalidGroups, group)) throw new Error(invalidGroups[group]);
    if (!Object.prototype.hasOwnProperty.call(rates, group)) throw new Error('missing disclosure-group rate');
    var balance = centsExact(a.curr_bal);
    var interest = interestCents(balance, rates[group]);
    var nextBalance = balance + interest;
    if (!within(nextBalance, BigInt('999999999999'))) throw new Error('updated current balance exceeds decimal(12,2)');
    if (!within(interest, BigInt('99999999999'))) throw new Error('interest amount exceeds transaction decimal(11,2)');
    if (interest === BigInt(0)) return;
    var matching = [];
    cards.forEach(function(c) { if (!c || typeof c !== 'object') return; try { if (accountKey(c.acct_id) === key) matching.push(trimRight(c.card_num)); } catch (ignored) {} });
    matching.sort();
    var card = matching.length ? matching[0] : '';
    if (!matching.length) diagnostic(index, id, 'no matching card; card_num is empty');
    var sequence = String(index + 1); while (sequence.length < 6) sequence = '0' + sequence;
    transactions.push({tran_id: parameter + sequence, type_cd: '01', cat_cd: 0, source: 'INTCALC', desc: 'Interest calculation', amt: money(interest), merchant_id: 0, merchant_name: '', merchant_city: '', merchant_zip: '', card_num: card, orig_ts: timestamp, proc_ts: timestamp});
    copy.curr_bal = money(nextBalance);
  } catch (e) { diagnostic(index, id, String(e.message || e) + '; account unchanged and no transaction emitted'); }
});
function cell(v) { return String(v).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' '); }
var markdown = '# Assumptions\n\nProvisional wiki-based calculation; not certified legacy parity. Physical file writing belongs to the excluded adapter.\n\n| What you assumed | Which wiki statement (or absence of one) it rests on |\n| --- | --- |\n';
assumptions.forEach(function(entry) { markdown += '| ' + cell(entry.assumption) + ' | ' + cell(entry.wikiBasis) + ' |\n'; });
output = {result: {intcalc_systran: transactions, intcalc_acctdata: updated, assumptions: assumptions, assumptions_md: markdown}};
```

_(server: 360 ms, 1 API call, 357 ms in API)_
