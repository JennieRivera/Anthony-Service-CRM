PHASE 2 — SERVICE INTAKES, PIPELINES AND WORKFLOWS

Continue upgrading the Anthony Multiservice LLC CRM without deleting or breaking any existing working feature.

Create bilingual English/Spanish intake forms, service records, statuses, tasks and workflows for each service category.

GENERAL RULES

1. Every service record must be connected to one Master Client.
2. One client can have multiple active services.
3. Every service must include:
   - Service ID
   - Client ID
   - Service Category
   - Service Type
   - Assigned User
   - Status
   - Start Date
   - Due Date
   - Next Follow-Up Date
   - Documents Requested
   - Documents Received
   - Payment Status
   - Invoice Number
   - Amount
   - Referral Source
   - Notes
   - Next Action
   - Closed Date
4. All forms and statuses must support ES | EN.
5. Add audit history showing who changed each service status and when.
6. Do not store full SSN, ITIN, card numbers, banking passwords or sensitive passwords in normal CRM fields.

-----------------------------------
1. NOTARY / RON / IPEN / LOAN SIGNING
-----------------------------------

Create fields:
- Notary Service Type
- In Person / Mobile / RON / IPEN
- Appointment Date
- Appointment Time
- Location
- Number of Signers
- Number of Documents
- Number of Notarial Acts
- ID Verification Status
- Witness Required
- Witness Provided By
- Document Type
- Loan Signing Company
- Title Company
- Signing Service
- Scanbacks Required
- Shipping Required
- Tracking Number
- Notary Fee
- Travel Fee
- Printing Fee
- Total Fee
- Payment Status
- Completion Status

Statuses:
New Request, Contacted, Appointment Scheduled, Waiting for Documents, Ready for Signing, Completed, Scanbacks Pending, Shipping Pending, Closed, Cancelled

-----------------------------------
2. TAX SERVICES
-----------------------------------

Create fields:
- Tax Year
- Individual / Business
- Federal / State
- Return Type
- Filing Status
- Business Entity Type
- Documents Requested
- Documents Received
- Intake Completed
- Preparation Status
- Review Status
- E-file Authorization Status
- E-file Status
- IRS Acceptance Status
- State Acceptance Status
- Balance Due / Refund
- Tax Preparation Fee
- Amount Paid
- Balance Remaining
- Internal Notes

Statuses:
New Client, Intake Pending, Documents Pending, Ready for Preparation, In Preparation, Internal Review, Client Review, Signature Pending, Ready to E-file, Filed, Accepted, Rejected / Correction Needed, Completed

-----------------------------------
3. BOOKKEEPING / ACCOUNTING SUPPORT
-----------------------------------

Create fields:
- Business Name
- Entity Type
- Industry
- Bookkeeping Frequency
- Monthly / Quarterly / Cleanup / Catch-Up
- Accounting Software
- Number of Bank Accounts
- Number of Credit Card Accounts
- Payroll Used
- Monthly Revenue Range
- Last Month Reconciled
- Reconciliation Status
- Cleanup Required
- Catch-Up Start Month
- Catch-Up End Month
- Monthly Service Fee
- Next Billing Date
- Reports Required
- Profit & Loss Status
- Balance Sheet Status
- Notes

Statuses:
Lead, Assessment, Proposal Sent, Onboarding, Access Pending, Documents Pending, Bookkeeping In Progress, Reconciliation, Internal Review, Reports Ready, Client Review, Active Monthly, Paused, Closed

-----------------------------------
4. IMMIGRATION ADMINISTRATIVE SERVICES
-----------------------------------

Create fields:
- Administrative Service Type
- Form Number
- Client Requested Form
- Client Provided Instructions
- Language
- Document Checklist
- Documents Received
- Translation Needed
- Translation Status
- Attorney Referral Needed
- Attorney Referral Date
- Filing Assistance Status
- Government Filing Fee
- Administrative Service Fee
- Notes

Show a permanent disclaimer:
"Anthony Multiservice LLC is not a law firm and does not provide legal advice. Administrative document preparation services are provided only within applicable legal limits."

Statuses:
New Inquiry, Administrative Intake, Client Instructions Pending, Documents Pending, Administrative Preparation, Client Review, Signature Pending, Ready for Client Filing, Attorney Referral, Completed, Cancelled

-----------------------------------
5. CREDIT SERVICES
-----------------------------------

Create fields:
- Credit Service Type
- Personal / Business Credit
- Initial Consultation Date
- Credit Education Completed
- Credit Report Review Date
- Main Client Goal
- Follow-Up Date
- Action Plan Status
- Monitoring Status
- Referral Partner
- Service Fee
- Notes

Permanent disclaimer:
"No credit score increase, approval, deletion, financing, or outcome is guaranteed."

Statuses:
New Inquiry, Consultation Scheduled, Assessment, Education, Action Plan, Follow-Up, Monitoring, Completed, Cancelled

-----------------------------------
6. BUSINESS CONSULTING
-----------------------------------

Create fields:
- Business Problem
- Business Stage
- Diagnosis Summary
- Primary Goal
- Recommended Strategy
- Consulting Package
- Start Date
- Number of Sessions
- Sessions Completed
- Next Session
- Milestones
- Action Plan
- 30-Day Goal
- 90-Day Goal
- Completion Percentage
- Consulting Fee
- Notes

Statuses:
Lead, Discovery Call, Diagnosis, Proposal, Agreement Signed, Implementation, Review, Active Consulting, Final Review, Completed

-----------------------------------
7. BUSINESS FORMATION
-----------------------------------

Create fields:
- Formation Type
- LLC / Corporation / Nonprofit / Other
- State of Formation
- Business Name
- Name Availability Checked
- Registered Agent
- EIN Assistance
- Formation Filing Status
- State Filing Date
- State Approval Date
- Document Delivery Status
- Service Fee
- Government Fee
- Notes

Statuses:
New Inquiry, Intake, Name Review, Documents Pending, Ready to File, Filed, State Pending, Approved, EIN Stage, Documents Delivered, Completed

-----------------------------------
8. COMMERCIAL FINANCE / RRI REFERRALS
-----------------------------------

Create fields:
- Referral Registration Number
- Originating Party
- Referred By
- Receiving Party
- Referral Date
- Business Name
- Business Entity
- Industry
- Years in Business
- Funding Purpose
- Amount Requested
- Monthly Revenue Range
- Financing Type
- Documents Requested
- Documents Received
- Consent to Share Information
- RRI Status
- Last Update
- Close Date
- Gross Revenue
- Allowed Deductions
- Net Service Revenue
- Commission Percentage
- Commission Due
- Commission Due Date
- Commission Paid Date
- Payment Method
- Payment Confirmation
- Notes

Statuses:
New Referral, Consent Pending, Submitted to RRI, RRI Reviewing, Documents Pending, Qualified, Declined, Approved, Closing, Funded, Commission Due, Commission Paid, Closed

-----------------------------------
9. COMMUNITY & STRATEGIC ALLIANCES
-----------------------------------

Create fields:
- Organization Name
- Contact Person
- Organization Type (Church, Chamber of Commerce, CPA/Accountant, Attorney, Insurance, Realtor, Consultant, Financial Partner, Technology Partner, Community Organization, Professional Association, Other)
- Phone
- Email
- Website
- State
- Country
- Relationship Owner
- Date Introduced
- Services Connected
- Referral Agreement
- Commission Agreement
- Marketing Permission
- Logo Permission
- Last Contact
- Next Follow-Up
- Status
- Notes

Statuses:
Prospect, Contacted, Meeting Scheduled, Under Discussion, Agreement Review, Active Partner, Paused, Inactive

-----------------------------------
10. ACADEMY / TRAINING
-----------------------------------

Create fields:
- Student Name
- Program
- Course
- Enrollment Date
- Payment Status
- Start Date
- Modules Completed
- Progress Percentage
- Attendance
- Assignments Completed
- Final Evaluation
- Certificate Status
- Certificate Date
- Community Access
- HighLevel Sync Status
- Notes

Statuses:
Lead, Registered, Payment Pending, Enrolled, Active Student, In Progress, Completed, Certificate Pending, Certified, Inactive

-----------------------------------
11. MARKETING / BRANDING / AI / AUTOMATION
-----------------------------------

Create fields:
- Project Type (Marketing / Branding / CRM / Automation / AI)
- Business Goal
- Current Systems
- Deliverables
- Start Date
- Deadline
- Responsible User
- Integrations Required
- AI Agent Required
- Approval Status
- Completion Percentage
- Project Fee
- Notes

Statuses:
Discovery, Audit, Strategy, Proposal, Approved, Build, Testing, Client Review, Live, Optimization, Completed

-----------------------------------
AUTOMATIC TASKS

For every new service:
- Create follow-up task.
- Assign service owner.
- Create payment check task if unpaid.
- Create document reminder if documents are pending.
- Create inactivity alert if no update occurs within the configured period.
- Create closing task when service status becomes Completed.

-----------------------------------
CLIENT 360 VIEW

Create a single Client 360 profile page showing:
- Personal / Business Information
- Active Services
- Closed Services
- Payments
- Outstanding Balance
- Referrals
- Appointments
- Tasks
- Communications
- Documents
- Academy Enrollment
- Strategic Partner Connections
- Notes
- Timeline / Activity History

Do not create duplicate client profiles when a new service is added.

-----------------------------------
SECURITY

Add role-based visibility so staff only see the service areas they are authorized to access.

Roles: Admin, Manager, Tax Staff, Bookkeeping Staff, Notary Staff, Consulting Staff, Academy Staff, Referral Manager, Community Manager

Prepare but do not yet activate HighLevel integration.

At the end, show a summary of:
1. database tables added or modified,
2. new pages created,
3. new fields,
4. workflows,
5. role permissions,
6. any migration required.
