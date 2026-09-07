CALENDAR ENHANCEMENT — CLIENT APPOINTMENTS, SERVICE COLOR CODING & AUTO-REGISTRATION

Continue upgrading the existing Anthony Multiservice LLC CRM Calendar.

IMPORTANT:
Do not create a duplicate Calendar module.
Extend the existing Calendar and Appointment system.
Preserve all existing Clients, Services, Tasks, Communications, Payments and Client 360 relationships.

REGLA MÁS IMPORTANTE (de Jennie, textual): No quiero una cita "suelta". Cada cita debe pertenecer a un cliente y a un servicio. Y visualmente, cuando abras el calendario, podrás reconocer de inmediato: verde = taxes, azul marino = notaría, rojo = financiamiento, etc.

==================================================
1. APPOINTMENT AUTO-REGISTRATION
==================================================

Whenever an appointment is created by: CRM staff, Client booking, Internal calendar, Future website booking, Future HighLevel booking, Future WhatsApp booking, Future AI Agent booking — automatically create an Appointment record in the CRM.

Each appointment must be connected to: Client, Company (if applicable), Service, Assigned Staff, Calendar, Communication history, Task/Follow-Up, Client 360, Company 360 (if applicable).

==================================================
2. REQUIRED APPOINTMENT INFORMATION
==================================================

Appointment ID, Client ID, Client Name, Business Name, Phone, Email, Preferred Language, Service Category, Service Type, Appointment Title, Appointment Date, Start Time, End Time, Duration, Appointment Type, Location/Meeting Link, Assigned Staff, Status, Referral Source, Notes, Documents Needed, Payment Required, Payment Status, Created By, Created Date, Last Updated.

Appointment Type: In Person, Phone, Zoom, Google Meet, Virtual, Mobile Service, RON, Other
Spanish: Presencial, Teléfono, Zoom, Google Meet, Virtual, Servicio móvil, RON, Otro

==================================================
3. AUTOMATIC CLIENT MATCHING
==================================================

Before creating a new client from an appointment, search existing records by Phone, Email, Client ID, Business Name. If client exists, link to existing Client 360. If not, create a new Lead/Prospect record. Do not create duplicate client profiles.

==================================================
4. SERVICE COLOR CODING
==================================================

Every appointment must use the color assigned to the selected service. Create one centralized Service Color Settings table.

Suggested colors:
Notary/RON/IPEN/Loan Signing: Navy Blue
Taxes: Green
Bookkeeping/Accounting: Teal
Immigration Administrative Services: Purple
Document Services: Light Blue
Credit Services: Gold
Business Consulting: Orange
Business Formation: Dark Green
Commercial Finance/RRI Referrals: Red
Academy/Training: Sky Blue
Community/Strategic Alliances: Lavender
Marketing/Branding/AI/Automation: Pink
Other: Gray

IMPORTANT: Store colors in settings so Admin can change them later. Do not hardcode colors throughout the application.

==================================================
5. CALENDAR DISPLAY
==================================================

On the calendar card show: Client Name, Service, Start Time, Assigned Staff, Appointment Status. Use service color as appointment card background or left-side color bar. Keep text readable and accessible. Add a legend showing each service color.

==================================================
6. CLICK APPOINTMENT DETAILS
==================================================

Detail panel showing: Client Name, Business, Service, Phone, Email, Language, Date, Time, Duration, Appointment Type, Location/Link, Assigned Staff, Status, Documents Needed, Payment Status, Notes, Referral Source.

Buttons: Open Client 360, Open Company 360, Open Service, Send Message, Reschedule, Cancel, Mark Completed, Create Follow-Up, Record Payment, Add Note.

==================================================
7. APPOINTMENT STATUSES
==================================================

Requested, Scheduled, Confirmed, Checked In, In Progress, Completed, No Show, Rescheduled, Cancelled
Spanish: Solicitada, Agendada, Confirmada, Registrado/Llegó, En proceso, Completada, No asistió, Reprogramada, Cancelada

==================================================
8. AUTOMATIC WORKFLOWS
==================================================

Creada → link a Client 360, link a Service, crear tarea de confirmación si aplica.
Confirmada → actualizar estado.
24h antes → preparar recordatorio. 2h antes → preparar segundo recordatorio.
Completada → agregar entrada en timeline, crear tarea de seguimiento si el servicio lo requiere, actualizar estado del servicio relacionado si aplica.
No Show → crear tarea de seguimiento, agregar etiqueta No Show.
Reprogramada → preservar historial original, crear nueva fecha, marcar original como Reprogramada.
Cancelada → preservar el registro, NO eliminar.

==================================================
9. CLIENT 360 CALENDAR HISTORY
==================================================

Dentro de Client 360 mostrar: Próximas Citas, Citas Pasadas, Citas Canceladas, No Shows, Servicio, Personal Asignado, Estado.

==================================================
10. CALENDAR FILTERS
==================================================

Filtros por: Servicio, Color de Servicio, Personal Asignado, Estado de Cita, Cliente, Ubicación, Tipo de Cita, Fecha, Idioma, Fuente de Referido.

==================================================
11. DAILY / WEEKLY / MONTHLY VIEW
==================================================

Vista Día, Semana, Mes, Agenda.

==================================================
12. FUTURE INTEGRATIONS
==================================================

Preparar pero NO activar: Google Calendar, Microsoft Outlook Calendar, HighLevel Calendar, Zoom, Google Meet. Usar un CRM Appointment ID como referencia interna maestra. Evitar citas duplicadas al sincronizar con calendarios externos.

==================================================
13. SECURITY
==================================================

Staff solo debe ver citas de: sus clientes asignados, sus departamentos autorizados.
Admin: acceso completo. Manager: todas las citas. Service Staff: solo citas de su servicio autorizado. Academy Staff: solo citas de Academia. Referral Manager: solo citas de Referidos/Financiamiento Comercial.

==================================================
14. FINAL VALIDATION
==================================================

Al terminar, reporte de: módulo de Calendario extendido, campos de cita, lógica de auto-emparejamiento de cliente, configuración de colores de servicio, leyenda del calendario, panel de detalle de cita, workflows, historial de citas en Client 360, filtros, permisos por rol, preparación de integraciones futuras, migraciones de base de datos requeridas.
