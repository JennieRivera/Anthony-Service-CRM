FASE 6 — AI TEAM / EQUIPO IA

Continue upgrading the Anthony Multiservice LLC CRM.

IMPORTANT:
Do not delete or break any existing features from Phases 1–5.
Keep bilingual English/Spanish support.
Keep all existing modules and security controls.

DECISIÓN DE ARQUITECTURA CONFIRMADA: Opción A — Panel de gestión

Estos agentes NO son chatbots de IA generativa conectados a un proveedor externo. Son una capa visual de organización sobre el trabajo que el sistema YA hace mediante reglas y automatizaciones (como las tareas automáticas y alertas de vencimiento ya construidas). Cada "agente" representa un área de trabajo con sus propias reglas, permisos, y actividad — no responde mensajes de clientes por su cuenta usando inteligencia artificial todavía. Esto se puede ampliar a IA conversacional real en una fase futura, sobre esta misma base.

Este debe ser UN SOLO módulo — no crear un "chatbot module" aparte después.

Diseño visual: colores vivos, avatares bien diseñados (forma humana o robot), con animación simple (ej. transiciones suaves, un pequeño movimiento) — no video ni avatar hablante por ahora.

==================================================
1. AI AGENT DIRECTORY
==================================================

Dashboard visual "AI Team / Equipo IA". Cada tarjeta de agente muestra:
Avatar, Nombre, Cargo/Posición, Departamento, Idioma, Estado, Clientes Asignados, Tareas de Hoy, Escalaciones Abiertas, Knowledge Base, Permisos, botón Abrir Agente, botón Pausar Agente, botón Configuración.

Estados: Online, Offline, Paused, Needs Review, Escalated
Español: En línea, Fuera de línea, Pausado, Requiere revisión, Escalado

Cada avatar debe estar claramente identificado como "AI Assistant" / "Asistente de IA" — nunca presentado como empleado humano.

==================================================
2-6. LOS 5 AGENTES INICIALES
==================================================

CHRISTAL — AI Client Concierge (Recepción y Servicio al Cliente)
Responsabilidades: recibir prospectos, identificar idioma preferido, identificar tipo de cliente (persona/negocio), identificar servicio necesario, crear lead, buscar cliente existente antes de duplicar, crear registro Client 360, asignar categoría de servicio, programar seguimiento, crear tarea, dirigir al departamento correcto, dar información general, escalar a humano cuando corresponda, capturar consentimiento de comunicación, capturar fuente de referido, capturar canal preferido.
Acceso permitido: Clientes, Client 360 básico, Servicios, Citas, Tareas, Comunicaciones, Fuente de Lead/Referido.
Acceso NO permitido: registros financieros completos, detalles de declaraciones de impuestos, archivos sensibles de inmigración, datos bancarios, detalles completos de comisión, configuración de Admin, credenciales del sistema.
Escala a humano cuando: cliente pide asesoría legal, pide estrategia fiscal más allá de info general, pide aprobación de financiamiento, está molesto o se queja, pide reembolso, comparte información sensible, la situación no está clara.

KAMYLA — AI Tax & Bookkeeping Assistant (Taxes y Bookkeeping)
Responsabilidades: revisar estado de servicio, crear checklists de documentos, identificar documentos faltantes, crear tareas recordatorio, dar seguimiento a bookkeeping y reconciliación, dar seguimiento al flujo de preparación de impuestos, preparar resúmenes internos, redactar recordatorios para clientes, actualizar estado cuando esté autorizado, marcar documentos vencidos, marcar periodos de bookkeeping incompletos.
Acceso permitido: registros de Taxes, registros de Bookkeeping, estado de documentos, Tareas, Citas, estado de Pagos, perfil de negocio del cliente, campos limitados del Registro de Compañías.
NO puede: dar asesoría fiscal individualizada sin revisión humana, garantizar reembolsos o resultados fiscales, presentar declaraciones de forma independiente, mostrar SSN/ITIN completos, acceder a contraseñas bancarias, cambiar elecciones fiscales automáticamente.
Descargo permanente: "Apoyo administrativo y educativo mediante IA. Las decisiones y presentaciones fiscales finales requieren revisión humana autorizada."
Escala cuando: aviso del IRS, auditoría, problema de identidad, discrepancia grande, estructura de entidad compleja, problema multi-estado, disputa del cliente, posible fraude, falta autorización.

DANIEL — AI Commercial Finance & Referral Assistant (Financiamiento Comercial y Referidos)
Responsabilidades: crear registro de referido, generar número de registro, identificar parte originadora y receptora, dar seguimiento al estado del referido, dar seguimiento al consentimiento de compartir información, recolectar información preliminar del negocio, propósito de financiamiento, monto solicitado, años en el negocio, rango de ingresos, crear tareas de seguimiento RRI, dar seguimiento a fecha de cierre, comisión debida/pagada, crear recordatorios de comisión, preparar resúmenes de referidos.
Acceso permitido: Registro de Referidos, módulo de Financiamiento Comercial, perfil de negocio del Registro de Compañías, registros de comisión de referidos, Tareas, Comunicaciones, estado básico de pago relacionado a comisión.
NO puede: aprobar financiamiento, garantizar aprobación, cotizar tasas no autorizadas, elegir prestamista sin proceso autorizado, representarse como prestamista, dar asesoría legal o financiera regulada más allá de guiones aprobados, acceder a archivos fiscales o de inmigración no relacionados.
Descargo permanente: "El financiamiento está sujeto a evaluación, elegibilidad, requisitos del proveedor y aprobación. No se garantiza ningún resultado."

ELENA — AI Immigration Administrative Assistant (Servicios Administrativos de Inmigración)
Responsabilidades: crear intake administrativo de inmigración, organizar información del cliente, crear checklists de documentos, dar seguimiento a números de formulario oficiales, edición de formulario USCIS, enlaces de fuente oficial, documentos recibidos, estado de traducción, crear tareas de seguimiento, dar seguimiento a notificaciones del gobierno, estado del caso administrativo, identificar cuándo se requiere referido a abogado, dar solo explicaciones administrativas aprobadas.
Acceso permitido: registros de Servicios Administrativos de Inmigración, Biblioteca de Formularios de Inmigración, recursos oficiales de USCIS, carpetas de documentos autorizadas del cliente, Tareas, Citas, Comunicaciones.
NO puede: determinar elegibilidad migratoria, elegir estrategia legal, recomendar remedios legales, interpretar ley de inmigración, representar al cliente ante USCIS, presentarse como abogada, garantizar resultados migratorios.
Descargo permanente: "Anthony Multiservice LLC no es un bufete de abogados y no brinda asesoría legal. Este asistente de IA ofrece únicamente apoyo administrativo."
Escala cuando: pregunta de elegibilidad, problema de deportación/remoción, historial criminal, apelación, exención (waiver), estatus complejo, interpretación legal, solicitud gubernamental que requiere análisis legal, cliente pregunta qué beneficio migratorio buscar.

SOFÍA — AI Document Services Assistant (Servicios Documentales)
Responsabilidades: crear intake de servicio documental, organizar instrucciones del cliente, crear checklist de documentos, dar seguimiento al estado del documento, firmas, estado de entrega, crear tareas de seguimiento, redactar checklists administrativos, organizar documentos de negocio, coordinar estado de traducción cuando aplique, preparar resúmenes internos.
Acceso permitido: registros de Preparación de Documentos, perfil básico del cliente, Registro de Compañías, estado de documentos, Tareas, Citas, Comunicaciones.
NO puede: dar asesoría legal, redactar estrategia legal, elegir remedios legales, presentarse como abogada o paralegal independiente, garantizar resultados legales o gubernamentales.
Descargo permanente: "Preparación administrativa de documentos únicamente. No se brinda asesoría legal."

==================================================
7. FUTUROS AGENTES — solo preparar estructura, inactivos
==================================================

Valentina — AI Business Consulting Assistant
Camila — AI Community & Academy Coordinator
Marco — AI Operations & Systems Assistant

No activarlos todavía, solo dejar su tarjeta preparada como "próximamente".

==================================================
8. SISTEMA DE AVATAR
==================================================

Campos: Nombre del Agente, Imagen de Avatar, Estilo de Avatar, Cargo, Departamento, Idioma, Voz Habilitada (preparado, no activo), Video Avatar Habilitado (preparado, no activo), Estado, Bio, Mensaje de Bienvenida.
Admin puede subir/cambiar la imagen del avatar.
Diseño: colores vivos, forma humana o robot, con animación simple (transiciones, pequeño movimiento) — no avatar de video hablante todavía.

==================================================
9. BASE DE CONOCIMIENTO POR AGENTE
==================================================

Cada agente tiene su Knowledge Base con secciones: Servicios Aprobados, Guiones Aprobados, FAQs, Políticas, Descargos, Checklists, Flujos de Trabajo, Formularios, Recursos Oficiales, Reglas de Escalación, Acciones Prohibidas.

==================================================
10. PERMISOS DEL AGENTE
==================================================

Cada agente tiene: Permiso de Lectura, Permiso de Escritura, Permiso de Crear Tarea, Permiso de Crear Nota, Permiso de Cambiar Estado, Permiso de Enviar Borrador, Permiso de Enviar Mensaje, Permiso de Escalar.

Regla por defecto — ningún agente puede: eliminar registros de clientes, eliminar pagos, eliminar referidos, modificar porcentajes de comisión, cambiar datos de propiedad, cambiar configuración de Admin, ver secretos del sistema.

==================================================
11. NIVELES DE APROBACIÓN HUMANA
==================================================

NIVEL 1 — Automático: crear tarea, crear nota, crear recordatorio, clasificar servicio, redactar mensaje (borrador, no enviado).
NIVEL 2 — Requiere Revisión Humana: mensajes al cliente sobre impuestos, finanzas, inmigración, crédito, reembolsos, quejas, cambios de precio.
NIVEL 3 — Solo Humano: decisiones legales, presentaciones fiscales, aprobaciones de financiamiento, aprobaciones de reembolso, firma de contratos, presentaciones gubernamentales, cambios de credenciales, cambios de permisos de acceso.

==================================================
12. CENTRO DE ESCALACIONES DE IA
==================================================

Página "AI Escalations / Escalaciones de IA". Campos: ID de Escalación, Agente, Cliente, Servicio, Motivo, Nivel de Riesgo, Fecha, Humano Asignado, Estado, Resolución, Fecha de Resolución.
Niveles de riesgo: Bajo, Medio, Alto, Crítico.

==================================================
13. BITÁCORA DE ACTIVIDAD DE IA
==================================================

Registro de auditoría de cada acción de cada agente: Agente, Fecha, Hora, Cliente, Servicio, Acción, Valor Anterior, Valor Nuevo, Aprobación Humana, Resultado, Error.
Admin debe poder revisar el historial completo.

==================================================
14. DASHBOARD DE IA
==================================================

Tarjetas: Agentes en Línea, Tareas Creadas por IA, Escalaciones Abiertas, Clientes Atendidos Hoy, Referidos Atendidos, Documentos Pendientes, Alertas de Taxes/Bookkeeping, Escalaciones de Inmigración, Revisiones Humanas Pendientes.

==================================================
15. REGLA CRÍTICA — SIN DUPLICAR DATOS
==================================================

Los agentes NO deben tener su propia copia de datos de clientes. Todos trabajan sobre el mismo Client 360 / Company (Anthony Multiservice 360) que ya existe — un agente solo VE y actúa sobre los registros reales, nunca crea una versión paralela o duplicada de un cliente o compañía.

==================================================
16. USO INTERNO PRIMERO
==================================================

No exponer estos agentes automáticamente a: sitio web público, WhatsApp público, Facebook público, Instagram público, Academia pública — hasta que permisos, pruebas, privacidad y guiones aprobados estén completos.

==================================================
17. SEGURIDAD
==================================================

Los agentes de IA no deben acceder a: llaves de API, contraseñas, variables de entorno, credenciales bancarias completas, datos completos de tarjeta, SSN completo, ITIN completo, secretos de Admin. Usar datos enmascarados donde se necesite.

==================================================
18. VALIDACIÓN FINAL
==================================================

Al terminar, dar un reporte de: agentes creados, avatares configurados, roles y permisos, knowledge bases, reglas de escalación, niveles de aprobación, bitácoras de actividad, componentes del dashboard, restricciones de seguridad, cualquier migración de base de datos requerida.
