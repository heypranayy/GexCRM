# GEXART CRM — Master Implementation Prompt

Use this as the single authoritative prompt when extending Gexart CRM into a commercial-grade **Agency Operating System** for Gexart Digital, Gexart Technologies, and Gexart Labs — and for resale to agencies in Kolkata and beyond.

---

## ROLE

You are the principal architect, CTO, product designer, security engineer, database architect, and senior full-stack engineer for **Gexart CRM** (Next.js 16 App Router, PostgreSQL, Prisma 7, better-auth).

**Do not build prototypes.** Every visible feature must work or be clearly marked "not configured." No fake GST filing, fake payment confirmations, fake e-invoice IRNs, or fake AI outputs.

---

## NON-NEGOTIABLE RULES

1. **Audit before coding** — inspect schema, actions, routes; reuse existing models (`crm_Accounts`, `Invoices`, `Users`, `Company`, `Branch`).
2. **Next.js only backend** — Server Actions, Route Handlers, service layer; no Express microservices.
3. **Server-side financial math** — GST, payroll, invoice totals; use `serializeDecimals()` for Prisma Decimals.
4. **Multi-company** — Gexart Digital, Gexart Technologies, Gexart Labs; company switcher scopes data.
5. **RBAC** — `PermissionMatrix` + server-side `hasPermission()`; never frontend-only admin checks.
6. **Preserve production data** — migrate, never drop invoice/customer tables silently.
7. **Privacy-compliant monitoring** — no keylogging, no password capture, no hidden surveillance; employees must be informed.

---

## THREE COMPANIES (MUST EXIST)

| Company | Prefix example |
|---------|----------------|
| Gexart Digital | GD |
| Gexart Technologies | GT |
| Gexart Labs | GL |

Each company: legal name, GSTIN, PAN, bank, UPI, branches, invoice series, monitoring policy, leave types, document settings (`GX/1/26-27` FY numbering).

Seed: `npx tsx scripts/seed-gexart-companies.ts`

---

## CORE BUSINESS FLOW

```
LEAD → DEAL → QUOTATION → PROFORMA → CUSTOMER → TAX INVOICE → PAYMENT → PROJECT → TASKS → SUBSCRIPTION/RENEWAL
```

All entities linked. Customer 360 shows everything in one timeline.

---

## SALES & GST INVOICING (Swipe-class, native Gexart UI)

**Routes:** `/sales/invoices`, credit notes, e-invoices, subscriptions, `/quotations`

**Dashboard:** Tabs (All/Pending/Paid/Cancelled/Drafts), search, date filters, summary cards (Total/Paid/Pending/Overdue from DB), paginated table, row actions.

**Create invoice:** Single-page GST flow — customer, items, HSN/SAC, CGST/SGST/IGST, tax inclusive/exclusive, discounts, round-off; totals computed server-side in `actions/invoices/sales-actions.ts`.

**GST engine:** `lib/invoices/gst-calculator.ts` — same state CGST+SGST, inter-state IGST, CESS, FY numbering.

**PDF templates:** Classic, Modern, Minimal, Professional — India GST layout, amount in words, bank/UPI.

**Public invoice:** `/invoice/{publicToken}` — no internal IDs exposed.

**E-invoice:** Provider abstraction (`lib/invoices/e-invoice-provider.ts`) — store IRN fields; do not fake government API.

**Payments:** Provider abstraction (`lib/invoices/payment-provider.ts`); partial/full payments; `lastPaymentMode` on invoice.

**Subscriptions:** Create UI + cron (`app/api/cron/subscriptions`) for auto-invoice generation.

**GSTR reports:** Exportable B2B/B2C, taxable value, CGST/SGST/IGST — structure for future filing integration.

---

## HR, ATTENDANCE, LEAVE, PAYROLL

**Attendance** (`/attendance`): Clock in/out, geofence, breaks, office/remote modes.

**Leave:** Apply in attendance tab; types Paid/Unpaid/Sick/Casual; HR approves at `/hr/monitoring`; unpaid leave reduces payroll via `lib/leave/payroll-leave.ts`.

**Payroll:** `calculateMonthlyPayouts` includes attendance + unpaid leave deductions; payslip PDF.

---

## EMPLOYEE MONITORING (TeamLogger-style, privacy-safe)

**When clocked in:**
- Work session linked to task (`WorkSession` model)
- Task switch from assigned Kanban tasks
- Aggregated active/idle seconds (mousemove/keydown/click — **not** keystroke content)

**Random work checks (CRITICAL):**
- Server-side randomization between `minIntervalMinutes` (5) and `maxIntervalMinutes` (300 = 5 hours)
- **Not** fixed intervals — unpredictable timing
- Skip during: break, outside work hours, not clocked in
- Browser notification + in-app dialog: "Quick work check"
- Employee: **Acknowledge** or **Update Work**
- After **3 missed checks** → `work_update_required` — must submit work done, in progress, blockers, on-call flag
- Optional screenshot on work update (policy-controlled, not continuous spy screenshots)
- Management dashboard: `/hr/monitoring` — sessions, missed checks, clocked-in employees

**Implementation files:**
- `lib/monitoring/random-check.ts`
- `actions/monitoring/monitoring-actions.ts`
- `components/monitoring/RandomCheckProvider.tsx` (global in app layout)

---

## CUSTOMER 360

Single customer profile tabs: Overview, Invoices, Payments, Projects, Tasks, Quotations, Communications, Documents, Subscriptions, Timeline.

Financial summary: LTV, invoiced, paid, outstanding, overdue.

---

## RBAC & ROLES

Master Admin, CEO, Admin, HR, Finance, Sales Manager, Sales Executive, PM, Employee, Custom Roles.

Permission matrix UI: module × view/create/edit/delete/approve/export.

---

## NAVIGATION TARGET

Dashboard | CRM | Sales (Invoices, Credit Notes, E-Invoices, Subscriptions, Quotations) | Customers | Projects | HR (Dashboard, Attendance, Monitoring, Payroll) | Finance | Reports | Settings

---

## ACCEPTANCE TESTS (must pass before release)

A–Z: customer, product, GST invoice, CGST+SGST, IGST, discounts, tax inclusive/exclusive, partial/full payment, overdue, credit note, duplicate, cancel, PDF, email, public URL, FY numbering, customer ledger, sales/GST reports, dark mode, mobile, permissions, audit log, **leave approval + unpaid deduction**, **random work check + 3-miss work update**.

---

## WHEN IMPLEMENTING

1. Run `prisma migrate deploy` + `prisma generate` after schema changes.
2. Typecheck, lint, build after each phase.
3. Match existing shadcn/Tailwind design system; dense SaaS tables; no placeholder buttons.
4. Git: work on `dev`; PR `dev → main` for releases.

---

## CURRENT IMPLEMENTATION STATUS (update as you go)

| Module | Status |
|--------|--------|
| Sales invoicing dashboard | Implemented |
| GST create flow | Implemented |
| Multi-company switcher | Implemented |
| Leave apply + HR approve | Implemented |
| Unpaid leave payroll deduction | Implemented |
| Work sessions + task tracking | Implemented |
| Random work checks | Implemented |
| HR monitoring dashboard | Implemented |
| Employee monitoring (screenshots every time) | **Not** — only optional on work update; no continuous screenshots |
| Customer 360 | Not complete |
| GST PDF templates (4) | Partial |
| Subscription cron | Not complete |
| WhatsApp live integration | Architecture only |
| GSTR export reports | Not complete |
| Full A–Z acceptance | Not verified |

---

*Use this document when starting a new implementation session on Gexart CRM.*
