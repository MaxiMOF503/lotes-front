# LoteSeguro · frontend

Angular 19 con Leaflet, conectado al backend lotes-back. Conserva consulta pública, registro, sesiones, permisos, mantenedor y estadísticas, y agrega consulta de las capas territoriales reales desde el mapa existente.

## Instalar en otra PC

Seguir la [guía del backend](https://github.com/MaxiMOF503/lotes-back/blob/area-interna-parcelas-reales/docs/instalacion-local.md): incluye la descarga de ambos repositorios, base MySQL, importación y cuentas de prueba.

Requiere Node.js 22 con npm. Iniciar primero el backend en el puerto 8080; luego, desde esta carpeta:

```powershell
.\iniciar-front.cmd
```

El asistente usa npm.cmd ci para instalar package-lock.json y arranca en http://localhost:4200. No requiere Angular CLI global. Si las dependencias ya están instaladas:

```powershell
npm.cmd start -- --host 127.0.0.1 --port 4200
```

proxy.conf.json envía /api a http://127.0.0.1:8080. Si cambia el puerto del backend, actualizar ese archivo y reiniciar el frontend. Angular nunca accede directamente a MySQL.

## Funcionalidades

El área interna abre Mi espacio para usuarios (consultas guardadas en su cuenta) y Parcelas reales para administradores (búsqueda por nomenclatura y fichas complementarias con fuente, referencia y control de versión). Registros anteriores conserva el mantenedor original. La documentación del backend en docs/area-interna-real.md explica los contratos.

- Consulta pública por identificador o dirección de lotes registrados.
- Selección de parcelas reales en el mapa, con nomenclatura y atributos publicados, radio general de AYSAM y cercanía de tramos eléctricos.
- Capas reales de catastro, electricidad y agua, limitadas a la ventana visible. Catastro requiere zoom 15 y electricidad zoom 12. Si falta información o hay demasiados elementos, la interfaz lo indica.
- Procedencia y límites visibles: el radio de agua y una línea eléctrica próxima no confirman conexión ni factibilidad; los datos catastrales no acreditan titularidad.
- Registro de usuarios normales, inicio/cierre de sesión y lectura interna según rol.
- Administración: listado paginado, alta, edición y eliminación/desactivación según el contrato existente, departamentos y procedencia documental.
- Validaciones y errores del servidor, incluidos identificadores repetidos.
- Estadísticas por fechas, totales y detalle diario de visitas y consultas.

El mapa trabaja con la captura importada en la base local. El buscador por dirección y el mantenedor trabajan con lotes registrados; las parcelas no contienen domicilios fiables ni se convierten automáticamente en registros del mantenedor. Una instalación nueva puede tener el mantenedor vacío y las capas reales completas.

Las estadísticas no identifican personas ni representan visitantes únicos. Una visita corresponde a cargar la aplicación; las consultas territoriales cuentan como consultas por coordenadas. Mover el mapa o activar capas no aumenta las consultas.

La cookie de sesión la gestiona el servidor; las escrituras usan CSRF. No se guardan contraseñas ni tokens en localStorage. La cuenta ADMIN de clase es demo.admin@loteseguro.invalid y la de lectura demo.usuario@loteseguro.invalid; cada persona elige sus contraseñas al iniciar el backend.

## Compilación y despliegue

```powershell
npm.cmd run build
```

Publicar dist/consulta-lotes-front/browser y enrutar /api al backend en el mismo origen HTTPS. El proxy de desarrollo no forma parte de esa compilación. Configurar la cookie Secure en el backend al utilizar HTTPS.

## Verificación

La compilación de producción y la consulta territorial en navegador fueron verificadas. Leaflet conserva su advertencia CommonJS y el paquete inicial supera el umbral de advertencia de 500 kB; la compilación termina correctamente. No hay ejecutor de tests de frontend configurado. El backend incorpora pruebas unitarias, de contratos, permisos y consultas espaciales sobre MySQL.

### Historial, comparación e informes

Las consultas del mapa con sesión iniciada generan un historial privado en MySQL. Mi espacio permite revisar copias históricas, comparar dos o tres parcelas guardadas con fuentes actuales y exportar informes HTML/JSON o imprimirlos como PDF desde el navegador. Las guardadas incluyen Ver informe. Las consultas anónimas siguen disponibles sin registro personal. No se modifican datos catastrales ni registros anteriores.

Validar exportación: `node --test scripts/test-informe.cjs`. Compilar: `npm.cmd run build`.
