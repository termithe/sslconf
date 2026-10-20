# Estado de SSLConf

Actualizado: 2026-10-20.

## Objetivo actual
- Publicar la metodología EN/ES del Análisis SSL/TLS basada en el motor real.
- Rutas propuestas: /methodology y /es/methodology; enlazadas desde la nota y footer.

## Contexto conocido
- Proyecto: /home/victorcancela/tls-chain-inspector; Next.js 14, React 18,
  TypeScript, Tailwind; npm y Docker local opcional.
- Producción canónica: https://www.sslconf.com, alojada en Vercel.
- GitHub termithe/sslconf; main despliega en Vercel automáticamente.
- Análisis SSL/TLS principal; herramientas de CA bundle, instalación TLS,
  cabeceras HTTP, certificados, CSR y comparación certificado/clave.
- Idiomas EN/ES. La nota es propia: no afirmar equivalencia con SSL Labs.
- No incorporar las conversaciones de firewalls/Wazuh a este proyecto.

## Último trabajo funcional conocido por la conversación
- SEO técnico implementado: metadatos compartidos, canónicas, hreflang,
  sitemap de 18 páginas y robots; consultas con host llevan noindex, follow.
- Archivos: lib/seo.ts, app/sitemap.ts, app/robots.ts,
  scripts/check-seo.mjs y SEO-PLAN.md.
- Commit referido: 9856bac, publicado y verificado en la sesión anterior.
- El usuario confirma propiedad de Search Console creada y los cuatro pasos
  de envío de sitemap/inspección realizados. No hay acceso a sus resultados.

## Decisiones vigentes
- Responder en castellano y recomendar modelo/razonamiento antes de trabajar,
  respetando las confirmaciones solicitadas por el usuario.
- Conservar cambios ajenos, limitar alcance y actualizar README en cambios
  importantes; no publicar ni cambiar producción sin autorización pertinente.
- No prometer primeras posiciones SEO ni plazos de indexación.
- No guardar ni exponer claves privadas o variables secretas en documentación.

## Verificación y límites
- Verificado en producción local (compilación existente): HTTP 200, text/plain
  y contenido correcto con Accept-Language: es; servidor de prueba detenido.
- Publicado por Git/Vercel: commit 0311e69, despliegue Ready.
- Verificada https://www.sslconf.com/.well-known/security.txt: HTTP 200,
  text/plain y contenido idéntico al archivo con Accept-Language en y es.
- En la sesión anterior constan build y script SEO correctos en local y producción;
  no se han repetido ni revalidado el despliegue en esta tarea.
- Al inicio había README modificado y AGENTS.md/SESSION_SUMMARY.md sin seguimiento,
  procedentes de la tarea documental anterior; se conserva su contenido.
- No existe npm test. Se desconoce la cobertura total de pruebas del motor TLS.
- No comprobados ahora: procesos/puertos activos, salud de producción, runtime
  remoto, estado de indexación y métricas de Search Console.

## Pendientes
- Propuesta siguiente: metodología del análisis en inglés y castellano,
  contrastando checks, límites y cálculo de nota con lib/tls-scan.ts antes de redactar.
- Revisar componentes/TLSServerScanResult.tsx y lib/i18n.ts únicamente si se
  añaden enlaces desde el informe; actualizar sitemap y prueba SEO al añadir páginas.
- Después: guías fullchain.pem frente a ca-bundle.crt y cadena SSL incompleta.
- La metodología incluye reglas, cobertura y límites; build, typecheck, lint y
  comprobación SEO local correctos. Pendiente despliegue y verificación pública.
- Footer publicado: commit 79fe9ed y despliegue Vercel Ready.
- Verificado en https://www.sslconf.com/ y /es: HTTP 200 y textos/enlaces
  del footer correctos. Build, typecheck y lint locales correctos.
