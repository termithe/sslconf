# Estado de SSLConf

Actualizado: 2026-10-28.

## Objetivo actual
- Mantener y evolucionar el conjunto de herramientas SSL/TLS públicas de SSLConf.
- Ya existen páginas públicas EN/ES de metodología, privacidad y uso responsable.

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
  sitemap de 24 páginas y robots; consultas con host llevan noindex, follow.
- Archivos: lib/seo.ts, app/sitemap.ts, app/robots.ts,
  scripts/check-seo.mjs y SEO-PLAN.md.
- Commit referido: 9856bac, publicado y verificado en la sesión anterior.
- El usuario confirma propiedad de Search Console creada y los cuatro pasos
  de envío de sitemap/inspección realizados. No hay acceso a sus resultados.
- Páginas operativas de privacidad y uso responsable publicadas en EN/ES:
  `/privacy`, `/es/privacy`, `/acceptable-use`, `/es/acceptable-use`.
  El footer las enlaza y el sitemap contiene 24 URLs indexables.
- Auditoría SEO técnica de 2026-10-28: producción con canonical `www`,
  redirección 308 del ápice, sitemap/robots correctos, `hreflang` recíproco y
  resultados con `host` en `noindex, follow`. La portada inglesa y metadatos
  de herramientas se ajustaron a sus intenciones reales; se añadió `WebSite`
  JSON-LD únicamente en la home.

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
- Metodología publicada: commit 53e2336 y despliegue Vercel Ready.
- Verificadas en producción /methodology y /es/methodology; sitemap con 20 URLs,
  incluidas sus dos versiones. Build, typecheck, lint y comprobación SEO local correctos.
- Footer publicado: commit 79fe9ed y despliegue Vercel Ready.
- Verificado en https://www.sslconf.com/ y /es: HTTP 200 y textos/enlaces
  del footer correctos. Build, typecheck y lint locales correctos.
- Commit funcional publicado: `eefdf21` (`Add privacy and responsible use pages`).
  Despliegue Vercel Ready y verificado en producción: cuatro páginas HTTP 200,
  contenido EN/ES, SEO de 24 rutas, sitemap, robots y redirección 308 del ápice
  hacia `www`.
- Pendiente de publicación en esta tarea: optimización SEO conservadora de la
  home y metadata de herramientas, más actualización de la prueba SEO y plan.

## Siguientes opciones
- Publicar las primeras guías técnicas EN/ES sobre `fullchain.pem`, CA bundles,
  HSTS o CAA, con ejemplos revisados y enlaces desde las herramientas.
- Revisar resultados de indexación y rendimiento en Search Console cuando haya
  pasado tiempo suficiente para el rastreo.
