# Business Workflow Acceptance

## Chain 1: Equipment Price To Inquiry

Status: Passed.

Pages:

`/equipment-prices` -> `/equipment-prices/[id]` -> `/equipment-prices/ai-recommendation` -> `/inquiries/create` -> `/inquiries`

Interactions:

- Open equipment detail.
- Enter AI recommendation.
- Select recommended price and suppliers.
- Create inquiry task.
- Generate AI inquiry letter draft.
- Return to inquiry management.

Mock state changes:

- Selected equipment and supplier are carried through query/mock workflow state.
- Inquiry creation shows mock toast and task creation feedback.

Issues: none blocking.

## Chain 2: Inquiry To Comparison To Project Pricing

Status: Passed.

Pages:

`/inquiries` -> `/comparisons/[id]` -> `/project-pricing`

Interactions:

- Open comparison detail.
- Select recommended plan.
- Continue into project pricing.
- Run AI automatic pricing.

Mock state changes:

- Selected comparison source is tracked in mock workflow state.
- AI pricing shows mock loading/completion.

Issues: none blocking.

## Chain 3: AI Quote Recognition To Storage

Status: Passed.

Pages:

`/ai-quote-recognition` -> `/pending-quotes` -> `/equipment-prices` or `/material-prices`

Interactions:

- Run AI recognition mock.
- Generate pending quote.
- Complete missing fields.
- Confirm storage.

Mock state changes:

- Recognition and review actions append workflow events.
- Storage action routes back to price libraries with toast feedback.

Issues: real OCR/upload not included.

## Chain 4: AI Collection To Price Leads

Status: Passed.

Pages:

`/ai-price-collection` -> `/price-leads` -> `/material-prices` or `/inquiries/create`

Interactions:

- Create collection task.
- Generate leads.
- Review lead detail.
- Store lead or create inquiry.

Mock state changes:

- Collection task and lead action create mock events.

Issues: real crawler/API collection not included.

## Chain 5: BOQ Parse To Project Pricing

Status: Passed.

Pages:

`/project-pricing/boq-parse` -> `/project-pricing`

Interactions:

- Review parsed BOQ rows.
- Correct mock fields.
- Generate price gaps.
- Enter project pricing center.

Mock state changes:

- BOQ source and correction actions are carried as mock workflow events.

Issues: real BOQ parser not included.

## Chain 6: AI Workbench Task Processing

Status: Passed.

Pages:

`/ai-workbench` -> business pages by task type -> `/ai-workbench`

Interactions:

- Switch task type tabs.
- View task detail.
- Continue processing.
- Mark complete or rerun mock task.

Mock state changes:

- Task actions append AI workflow events and trigger toast feedback.

Issues: real backend task queue not included.

## Chain 7: Report And Evidence Chain

Status: Passed.

Pages:

`/ai-report-center` -> `/reports/[id]` -> `/attachments` -> `/reports/[id]`

Interactions:

- Generate report task.
- Open report preview.
- View evidence references.
- Open attachment archive.
- Return to report.

Mock state changes:

- Report generation and export actions show mock feedback.

Issues: real Word/PDF generation not included.

## Chain 8: System Settings Save

Status: Passed.

Pages:

`/settings` and `/settings/ai`

Interactions:

- Modify mock settings.
- Save.
- Reset.
- Modify AI rules.
- Save AI settings.

Mock state changes:

- Settings panel displays saved/reset feedback using frontend state and toast.

Issues: settings are not persisted to backend.
