PHASE 5 — SALES TAX, IRS BUSINESS REGISTRATION, IMMIGRATION FORMS LIBRARY, LATINO BUSINESS MAP, ASSOCIATIONS DIRECTORY & COMPANY MASTER REGISTRY

Continue upgrading the Anthony Multiservice LLC CRM.

IMPORTANT:
Do not delete or break any existing working feature from Phases 1–4.
Keep bilingual English/Spanish support.
Keep all internal CRM modules and security controls.
Do not build the public client frontend yet.

==================================================
1. SALES TAX REGISTRATION MODULE
==================================================

Create a new module: Sales Tax Registration / Registro de Sales Tax

Purpose: Track sales tax registration requirements, status, filings, account numbers, state agencies, and client progress for each business.

Fields: Sales Tax Case ID, Client ID, Business ID, Business Legal Name, DBA, Entity Type, State, State Tax Agency, Agency Website, Registration Portal URL, Sales Tax Account Number, Registration Status, Registration Date, Effective Date, Filing Frequency (Monthly/Quarterly/Annual/Other), Next Filing Due Date, Last Filed Period, Last Filing Date, Amount Due, Amount Paid, Payment Date, Account Status, Documents Requested, Documents Received, Assigned User, Notes

Statuses: Not Started, Research Required, Registration Pending, Submitted, Approved, Account Active, Filing Due, Filed, Past Due, Closed
Spanish: No iniciado, Requiere investigación, Registro pendiente, Enviado, Aprobado, Cuenta activa, Declaración pendiente, Presentado, Vencido, Cerrado

==================================================
2. INTERACTIVE U.S. SALES TAX MAP
==================================================

Create an interactive color-coded U.S. map. Display all 50 states, each clickable.

On click, show: State Name, State Abbreviation, State Department of Revenue/Tax Agency, Official Website, Sales Tax Registration Link, Sales Tax Filing Portal, Business Registration Link, Notes, Last Verified Date. Use official state government links only. Allow Admin to update links and notes.

Color coding: Green = active client sales tax cases in that state; Blue = state info available, no active cases; Gold = registration or filing action pending; Red = past due filing or unresolved issue; Gray = no records yet. Add legend.

Do not infer tax requirements automatically. Show disclaimer: "State sales tax requirements vary by business activity, nexus, products, services and jurisdiction. Review official state guidance before filing."

==================================================
3. IRS / EIN / ITIN CASE MANAGEMENT
==================================================

Create a module: IRS Registration & Identification / Registro IRS e Identificación

Case types: EIN Assistance, ITIN Administrative Assistance, IRS Business Account Follow-Up, IRS Correspondence, Other IRS Administrative Service

Fields: IRS Case ID, Client ID, Business ID, Case Type, Taxpayer Name, Business Legal Name, Entity Type, Responsible Party, State, Date Started, Documents Requested, Documents Received, Application Status, Submission Method, Submission Date, IRS Reference Number, EIN Status, ITIN Status, IRS Letter Received, IRS Letter Date, Follow-Up Date, Assigned User, Notes

EIN Status: Not Started, Information Pending, Ready, Submitted, EIN Received, Closed
ITIN Status: Not Started, Documents Pending, W-7 Preparation, Certification/Documentation Step, Submitted, IRS Processing, Additional Information Requested, ITIN Received, Closed

IMPORTANT SECURITY: Do not store full SSN or full ITIN in normal CRM fields. If identification is needed, use last 4 digits only or a secure document reference. Do not store passport numbers in normal CRM fields.

==================================================
4. IRS OFFICIAL RESOURCE CENTER
==================================================

Create an internal resource page: IRS Resource Center / Centro de Recursos IRS

Categories: EIN, ITIN, Business Taxes, Employment Taxes, Estimated Taxes, IRS Forms, IRS Publications, IRS Notices, IRS Contact Resources

Each resource: Resource Name, Category, Official IRS URL, Description, Last Verified Date, Active/Inactive. Only official IRS.gov links. Do not represent this page as a direct IRS system connection unless an approved integration actually exists.

==================================================
5. IMMIGRATION FORMS LIBRARY
==================================================

Create a secure internal module: Immigration Forms Library / Biblioteca de Formularios de Inmigración

Categories: Family-Based, Employment-Based, Humanitarian, Citizenship/Naturalization, Permanent Residence, Work Authorization, Travel Documents, Affidavits/Supporting Forms, Change of Address, Fee Waivers, USCIS General Forms, Other

Each form: Form Number, Form Name, Category, Official Source, Official USCIS URL, Current Edition Date, Expiration/Edition Notes, Filing Fee Reference, Instructions URL, Checklist, Internal Notes, Last Verified Date, Active/Retired

IMPORTANT: Do not upload or maintain unofficial modified government forms as the authoritative version. Use official USCIS sources as the reference.

Add permanent disclaimer: "Anthony Multiservice LLC is not a law firm and does not provide legal advice. Immigration administrative document services are limited to permitted administrative assistance. The client or authorized legal professional must determine eligibility, legal strategy and appropriate legal remedies."

==================================================
6. IMMIGRATION CLIENT DOCUMENT FOLDERS
==================================================

Inside each Immigration Administrative Service case, create organized folders: 01 Intake, 02 Identity Documents, 03 Client-Provided Information, 04 Government Forms, 05 Supporting Documents, 06 Translation, 07 Signatures, 08 Filing Confirmation, 09 Government Notices, 10 Final Documents

Do not store sensitive documents in public or shared referral areas. Apply role-based access — only authorized immigration service staff and Admin may access these folders.

==================================================
7. LATINO BUSINESS & ENTREPRENEUR MAP
==================================================

Create an interactive U.S. map: Latino Business Opportunity Map / Mapa de Oportunidades de Negocios Latinos

Purpose: Help Anthony Multiservice LLC identify states and regions with strong Latino business presence and expansion opportunities.

Each state: State Name, Estimated Latino Population, Estimated Latino Business Presence, Number of AMS Clients, Number of Strategic Partners, Number of Associations, Number of Chambers, Number of Active Leads, Revenue from State, Opportunity Score, Notes

Use public datasets only for population/business statistics. Prepare data source fields: Source Name, Source URL, Year, Last Updated, Data Type. Potential sources: U.S. Census Bureau, SBA, state economic development agencies, chambers of commerce, Latino business associations, other verified public sources.

==================================================
8. COLOR-CODED LATINO BUSINESS MAP
==================================================

Color intensity for opportunity level: Dark Green = Very High, Green = High, Gold = Medium, Light Blue = Emerging, Gray = Insufficient Data

On click show: Latino Population, Latino-Owned Business Data, Top Business Industries, AMS Clients, AMS Leads, Strategic Partners, Associations, Chambers, Revenue, Potential Services, Expansion Notes

Filters: Population, Businesses, Clients, Partners, Revenue, Industry, Association Count, Opportunity Score

==================================================
9. ASSOCIATIONS & CHAMBERS DIRECTORY
==================================================

Create a directory: Associations & Chambers / Asociaciones y Cámaras

Fields: Organization ID, Organization Name, Organization Type (Latino Chamber, Chamber of Commerce, Business Association, Professional Association, Community Organization, Faith-Based Organization, Other), State, City, Country, Website, Phone, Email, Contact Person, Industry Focus, Latino Focus, Membership Status, Membership Cost, AMS Relationship Status, Date Contacted, Last Contact, Next Follow-Up, Partnership Opportunity, Notes

Statuses: Research, Prospect, Contacted, Meeting Scheduled, Member, Strategic Partner, Inactive

Connect each organization to the U.S. map.

==================================================
10. COMPANY MASTER REGISTRY
==================================================

Create a major new internal module: Company Master Registry / Registro Maestro de Compañías

Purpose: Store all business/company information in one organized master record. Each company must have a unique Company ID.

Fields: Company ID, Legal Business Name, DBA/Trade Name, Entity Type (LLC, Corporation, S Corporation, Partnership, Sole Proprietor, Nonprofit, Other), State of Formation, Formation Date, State Document Number, EIN Status, EIN Last 4, Registered Agent, Registered Agent Address, Principal Business Address, Mailing Address, Phone, Email, Website, Industry, NAICS Code, Business Description, Years in Business, Number of Employees, Annual Revenue Range, Monthly Revenue Range, Fiscal Year End, Accounting Method, Bookkeeping Software, Payroll Provider, Sales Tax Required, Sales Tax States, Licenses Required, Insurance Status, Owner(s), Authorized Representative(s), Ownership Percentage, Banking Relationship, Business Credit Status, Funding Needs, RRI Referral Status, Tax Service Status, Bookkeeping Status, Consulting Status, CRM Status, Marketing Status, Academy Status, Notes

IMPORTANT: Do not store complete sensitive banking credentials.

==================================================
11. COMPANY OWNERS & CONTACTS
==================================================

Allow one company to have multiple owners and contacts. Create related tables: Company Owners, Company Contacts, Authorized Representatives

Owner fields: Name, Role, Ownership Percentage, Phone, Email, Preferred Language, Authorized Signer, Start Date, End Date, Notes

==================================================
12. COMPANY DOCUMENT CHECKLIST
==================================================

Inside each Company Master Record create checklist categories: Formation Documents, EIN Documents, Operating Agreement, Bylaws, State Registration, Annual Report, Business Licenses, Sales Tax, Insurance, Bookkeeping, Tax Returns, Contracts, Financing Documents, Other

Track: Requested, Received, Verified, Expired, Renewal Due

==================================================
13. COMPANY COMPLIANCE DASHBOARD
==================================================

Create a Company Compliance panel showing: Entity Status, Annual Report Due, Sales Tax Status, Business License Status, Insurance Status, Tax Status, Bookkeeping Status, Registered Agent Status, Document Completeness, Financing Readiness

Status colors: Green = Current, Gold = Action Needed, Red = Past Due/Critical, Gray = Not Applicable/Unknown

==================================================
14. COMPANY 360 VIEW
==================================================

Create one Company 360 page showing: Company Profile, Owners, Contacts, Services, Invoices, Payments, Taxes, Bookkeeping, Sales Tax, IRS Cases, Immigration Administrative Cases, Credit Services, Consulting, Commercial Finance, RRI Referrals, Documents, Tasks, Appointments, Communications, Strategic Partners, Academy, Notes, Timeline

Do not create duplicate companies.

==================================================
15. MAP + COMPANY INTEGRATION
==================================================

Connect Company Master Registry to the U.S. map. Show: Companies by State, Clients by State, Revenue by State, Service Demand by State, Sales Tax Clients by State, RRI Referrals by State, Latino Business Opportunity by State

Clicking a state should allow the user to open: Companies, Clients, Leads, Partners, Associations, Tax Agency, Revenue, Opportunity Data

==================================================
16. DASHBOARD SECTIONS
==================================================

Add new dashboard cards: Companies Registered, Companies by State, Sales Tax Cases, Sales Tax Due, EIN Cases, ITIN Cases, Immigration Administrative Cases, Latino Business Opportunities, Active Associations, Strategic Chambers, Expansion States, Company Compliance Alerts

==================================================
17. SECURITY AND PRIVACY
==================================================

Role-based access:
Admin: full access
Tax Staff: tax, EIN, sales tax
Bookkeeping Staff: bookkeeping and company financial profile
Immigration Staff: immigration administrative cases only
Consulting Staff: business and company strategy
Referral Manager: commercial finance and referral data
Community Manager: associations and chambers

Do not expose: Full SSN, Full ITIN, Bank passwords, Full card information, Sensitive identity documents, Immigration documents — outside authorized secure folders.

==================================================
18. DATA FRESHNESS
==================================================

For maps, tax agencies, IRS resources, USCIS forms and associations, include: Last Verified Date, Source, Source URL, Verified By, Active/Inactive

Create alerts when official resources have not been reviewed for 180 days.

==================================================
19. FINAL VALIDATION
==================================================

After implementation provide a report showing: new database tables, Company Master Registry, Sales Tax module, U.S. tax map, IRS case system, IRS resource center, Immigration Forms Library, immigration document folders, Latino Business Opportunity Map, Associations Directory, Company Compliance Dashboard, Company 360 View, new security roles, data source structure, any external API/data integrations still needed.

Do not activate automated government filings. Do not create a direct IRS or USCIS filing connection unless an authorized, documented integration is available.
