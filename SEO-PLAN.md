# SEO y crecimiento de SSLConf

Auditoría técnica revisada: 2026-10-28. Canónico: https://www.sslconf.com.
Estado: fundamentos técnicos publicados y comprobados desde producción; pendiente obtener señales de rastreo, indexación e impresiones de Search Console.

## Evidencias verificadas

- `https://www.sslconf.com` responde `200`; `https://sslconf.com` redirige con `308` al dominio canónico. Las páginas probadas sirven HTTPS y HSTS.
- `/robots.txt` permite páginas públicas, excluye `/api/` e incluye el sitemap. `/sitemap.xml` responde `200` y enumera 24 URL canónicas EN/ES, con alternates recíprocos y `x-default`.
- Las páginas indexables incluyen canonical autoreferenciada a `www`, `hreflang` EN/ES/x-default y contenido renderizado por servidor: title, meta description, H1 y enlaces navegables. Las consultas con `host` son `noindex, follow` y no publican canonical ni `hreflang`.
- La home inglesa se orientó a `SSL Checker & TLS Diagnostic Tools`; cada herramienta inglesa tiene title y description propios según su capacidad real. No se modificaron URLs, lógica criptográfica ni llamadas de diagnóstico.
- Se publica un único `WebSite` JSON-LD en la home canónica con nombre `SSLConf` y URL `https://www.sslconf.com/`. No se añaden FAQ, reseñas, valoraciones ni Schema de aplicación hasta que representen contenido visible suficiente.
- La comprobación local `scripts/check-seo.mjs` valida 24 páginas, títulos únicos, JSON-LD de la home, canonical, `hreflang`, `noindex`, sitemap, robots, redirección de idioma y 404. No mide posiciones, Core Web Vitals de campo, backlinks ni cobertura de Google.

No se han comprobado todavía resultados de Search Console, volumen de búsquedas, ingresos, rendimiento de campo ni indexación real URL a URL. Una consulta `site:` no sustituye Search Console.

## Prioridades

1. Fundamentos: canonical por pagina a www, hreflang EN/ES/x-default reciproco, sitemap, robots, metadata por herramienta y politica de indexacion de resultados. Verificar paginas reales y redirecciones antes de publicar.
2. Medicion: propiedad de dominio Search Console por TXT, enviar sitemap, Bing Webmaster Tools y analitica de uso sin registrar PEM, claves privadas ni dominios consultados.
3. Contenido: completada la primera capa en `/scan`, `/check`, `/decode` y `/csr`, con explicaciones técnicas y enlaces contextuales EN/ES bajo el formulario. Conservar el formulario principal visible. Siguiente paso: publicar guías técnicas enlazadas a las herramientas con ejemplos reproducibles y fuentes primarias.
4. Credibilidad: metodologia de puntuacion y limitaciones, autor con experiencia verificable, contacto, privacidad y terminos. No prometer equivalencia con SSL Labs ni validacion mas amplia de la que realiza el motor.
5. Distribucion: enlace contextual desde DNSRadar, demostraciones tecnicas y contribuciones utiles a comunidades. Sin enlaces comprados ni directorios masivos.

## Mapa inicial de contenido

Son hipotesis de intencion, no keywords con volumen/dificultad medidos.

| Intencion | Pagina objetivo |
| --- | --- |
| SSL server test / analizar SSL TLS | /scan y /es/scan |
| CA bundle generator / generar cadena SSL | /check y /es/check |
| Certificate key match / comprobar certificado y clave | /match y /es/match |
| CSR generator / generador CSR | /csr/generate y equivalente ES |
| Certificate decoder / decodificador certificado | /decode y equivalente ES |
| fullchain.pem vs ca-bundle.crt | Guia con ejemplos nginx/Apache |
| unable to get local issuer certificate | Guia de diagnostico y correccion |
| Certificado Root cross-signed vs autofirmado | Guia sobre cuando incluir cada CA |
| Diferencias TLS entre IPv4 e IPv6 | Guia con comprobaciones directas por IP y SNI |

La home presenta la suite y destaca el analisis; evitar duplicar una landing para cada sinonimo. No generar miles de paginas para dominios escaneados.

## Skills

Disponibles: seo-audit y find-skills; frontend-design para accesibilidad y presentacion.
Complementos candidatos de coreyhaines31/marketingskills: content-strategy y schema (contenido revisado remotamente). ai-seo, analytics y programmatic-seo requieren revision especifica antes de adoptarlos. No se han instalado skills nuevas.
La popularidad del repositorio no prueba eficacia SEO. Contrastar recomendaciones con Google Search Central.

## Monetizacion

Primero medir uso y recurrencia. Candidatos: patrocinio tecnico contextual, afiliacion transparente de servicios pertinentes, y despues API/informes por lotes para agencias si hay demanda. Publicidad display depende del volumen y RPM real; estimacion orientativa: paginas vistas / 1000 * RPM, antes de costes. No existe estimacion de ingresos verificada para SSLConf.
No incentivar compra de SSL de pago como requisito universal ni condicionar la nota a patrocinadores.
No incorporar trackers de publicidad en flujos que manejan claves privadas sin revisar aislamiento y privacidad.

## Fuentes

- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/blog/2024/03/core-update-spam-policies
- https://www.skills.sh/coreyhaines31/marketingskills
- https://github.com/coreyhaines31/marketingskills

Objetivo operativo: corregir descubrimiento e indexabilidad primero; medir impresiones, clics no ligados a marca, consultas y uso de herramientas durante las semanas siguientes. No prometer fechas ni posiciones.
