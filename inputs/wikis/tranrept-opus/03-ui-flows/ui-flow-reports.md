<style>
.wf-container { border: 1px solid rgba(253,185,19,0.3); border-radius: 8px; padding: 20px; margin: 20px 0; background: #1a1721; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #c9c9c9; }
.wf-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; color: #fdb913; margin-bottom: 16px; text-transform: uppercase; }
.wf-card { background: #0e0e10; border: 1px solid #2a2a2e; border-radius: 6px; padding: 16px; margin-bottom: 12px; }
.wf-card-title { font-size: 13px; font-weight: 600; color: #fdb913; margin-bottom: 12px; }
.wf-field { margin-bottom: 10px; } .wf-field-label { font-size: 11px; color: #888; margin-bottom: 4px; }
.wf-input { background: #141517; border: 1px solid #2a2a2e; border-radius: 4px; padding: 8px 12px; color: #666; font-size: 12px; width: 100%; box-sizing: border-box; }
.wf-select { background: #141517; border: 1px solid #2a2a2e; border-radius: 4px; padding: 8px 12px; color: #666; font-size: 12px; width: 100%; box-sizing: border-box; }
.wf-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.wf-btn { background: #2a2a2e; border: 1px solid #3a3a3e; border-radius: 4px; padding: 8px 18px; color: #c9c9c9; font-size: 12px; display: inline-block; }
.wf-btn-primary { background: #fdb913; border: 1px solid #fdb913; color: #0e0e10; font-weight: 600; border-radius: 4px; padding: 8px 18px; font-size: 12px; display: inline-block; }
</style>

# UI Flow: Reports

> **Powered by FLOWX.AI Coding Agents**

| Field | Value |
|-------|-------|
| **Name** | Reports |
| **Legacy Map** | `CORPT00` / CR00 |
| **Process** | [Reports](../02-processes/process-reports.md) |
| **Swimlane** | User, Admin |

## User Story

*As a* clerk, *I need to* generate a transaction report for a date range *so that* I can review activity and produce a PDF for records.

## Wireframe

<div class="wf-container">
<div class="wf-label">SCREEN: Transaction Reports</div>
<div class="wf-card">
<div class="wf-card-title">Report Parameters</div>
<div class="wf-field"><div class="wf-field-label">Account ID</div><div class="wf-input">00000000123</div></div>
<div class="wf-field"><div class="wf-field-label">From Date *</div><div class="wf-input">📅 2024-05-01</div></div>
<div class="wf-field"><div class="wf-field-label">To Date *</div><div class="wf-input">📅 2024-05-31</div></div>
<div class="wf-field"><div class="wf-field-label">Report Type *</div><div class="wf-select">Transaction Detail ▾</div></div>
</div>
<div class="wf-footer"><span class="wf-btn">Cancel</span><span class="wf-btn-primary">Generate</span></div>
</div>

## Key Interactions

- **Generate** — query data, render PDF (via [Statement PDF Renderer](../04-integrations/system-statementpdf.md)), offer download.

## Data Bindings

| Component | Data Path | Validator |
|-----------|-----------|-----------|
| Account ID | `report.accountId` | numeric |
| From/To Date | `report.fromDate` / `.toDate` | required, valid range (from ≤ to) |
| Report Type | `report.type` | required |

---
*Powered by **FLOWX.AI** Coding Agents*
