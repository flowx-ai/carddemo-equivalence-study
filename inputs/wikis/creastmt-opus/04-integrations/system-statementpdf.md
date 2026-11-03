# System: Statement PDF Renderer

> **Powered by FLOWX.AI Coding Agents**

| Field | Value |
|-------|-------|
| **Name** | Statement PDF Renderer |
| **Type** | REST |
| **Legacy Source** | `TXT2PDF1.JCL` (TXT2PDF utility converting report text to PDF) |
| **Auth** | NO_AUTH `{{TODO: confirm}}` |
| **Status** | Draft |

## Purpose

Renders statement/report models to PDF, replacing the mainframe `TXT2PDF` utility. Used by [Statement Generation](../02-processes/process-statement-generation.md) and [Reports](../02-processes/process-reports.md).

`{{DECISION: Use the FlowX document plugin (recommended — see document-strategy.md) vs an external PDF microservice. If using the document plugin, this "system" is replaced by a Document Template and no external REST system is needed.}}`

## Connection

| Field | Value |
|-------|-------|
| Base URL | Configuration Parameter `pdfRendererUrl` (Environment Variable) |
| Operation | `POST /render` → `{ model }` → PDF binary/ref |

## Operations

| Operation | Used By Workflow |
|-----------|------------------|
| Render PDF | [Render Statement PDF](workflow-renderpdf.md) |

---
*Powered by **FLOWX.AI** Coding Agents*
