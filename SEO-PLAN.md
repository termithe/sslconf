# SEO y crecimiento de SSLConf

Auditoria inicial: 2026-10-19. Canonico propuesto: https://www.sslconf.com.
Estado: fundamentos implementados en codigo (canonicas www, idiomas, sitemap, robots y politica de consultas); pendiente confirmar publicacion y enviar sitemap en Search Console. Las evidencias siguientes reflejan el estado anterior a estas correcciones.

## Evidencias verificadas

- /robots.txt y /sitemap.xml responden 404. Esto no bloquea por si solo la indexacion, pero falta facilitar descubrimiento y reglas de rastreo.
- /check y /es/check responden 200 con noindex,nofollow incluso sin parametros: la herramienta no es indexable.
- / y /scan no publican canonical en el HTML consultado.
- No se encontro configuracion hreflang en app; faltan alternates por idioma.
- app/layout.tsx usa https://sslconf.com como metadataBase de respaldo, mientras el dominio publico redirige a www. Revisar tambien la variable de entorno de produccion.
- La home publica el titulo SSL/TLS Tools; mejorar objetivo y marca.
- /scan no distingue robots para URL con host. Definir paginas de herramientas indexables y resultados de consultas noindex,follow, sin incluir estos ultimos en sitemap.
- El middleware redirige algunas rutas segun idioma. Revisar acceso estable a versiones EN/ES y enlazado reciproco sin perder la preferencia de idioma del usuario.

No se ha comprobado Search Console, volumen de busquedas, ingresos, rendimiento de campo ni indexacion real en Google. Una consulta site: no sustituye Search Console.

## Prioridades

1. Fundamentos: canonical por pagina a www, hreflang EN/ES/x-default reciproco, sitemap, robots, metadata por herramienta y politica de indexacion de resultados. Verificar paginas reales y redirecciones antes de publicar.
2. Medicion: propiedad de dominio Search Console por TXT, enviar sitemap, Bing Webmaster Tools y analitica de uso sin registrar PEM, claves privadas ni dominios consultados.
3. Contenido: conservar el formulario principal visible. Publicar guias tecnicas enlazadas a las herramientas con ejemplos reproducibles y fuentes primarias. Mantener EN/ES con contenido revisado.
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
