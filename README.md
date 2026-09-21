# Frontend — Consulta Pública de Lotes (F-01)

Aplicación Angular 19 con mapa interactivo (Leaflet) para consultar fichas demostrativas de lotes.

## Requisitos previos

- Node.js 18+ y npm
- Angular CLI: `npm install -g @angular/cli`

## Instalación y ejecución

```bash
npm install
ng serve
```

Abrir `http://localhost:4200` en el navegador.

## Estructura del proyecto

```
src/app/
├── components/
│   ├── mapa-lote/            # Mapa interactivo con Leaflet
│   ├── buscador-ubicacion/   # Búsqueda por ID o coordenadas
│   ├── ficha-lote/           # Panel lateral con ficha del lote
│   └── badge-procedencia/    # Indicador visual de datos simulados
├── services/
│   └── lote.service.ts       # Capa de acceso a datos (mocks → API)
├── models/
│   └── ficha-lote.model.ts   # Interfaces del contrato backend
└── mocks/
    └── lotes-data.mock.ts    # Datos locales temporales simulados
```

## Decisiones de diseño

### Separación estado / vista

`LoteService` gestiona todo el estado de la consulta mediante `BehaviorSubject` y expone observables. Los componentes se suscriben con el pipe `async` y no manejan estado interno.

### Preparación para reemplazar mocks por API

`LoteService` expone métodos con firma estable (`consultarPorIdentificador`, `consultarPorCoordenadas`). Actualmente resuelven desde datos locales en `lotes-data.mock.ts`. Para integrar la API real del backend (`GET /api/public/v1/lotes/ficha`), solo se reemplaza la implementación interna por `HttpClient.get()` sin modificar ningún componente.

### Responsive

CSS por componente con media queries. Desktop: grid de dos columnas (mapa + panel). Móvil (< 768px): una columna apilada.

### Datos simulados distinguidos

El componente `BadgeProcedencia` muestra un badge naranja "⚠ DATO SIMULADO" en cada sección donde `procedencia.oficial === false`.

## Datos demostrativos incluidos

| Lote | Dirección | Coordenadas | Departamento |
|---|---|---|---|
| LOT-DEMO-001 | Calle Demostración 123 | -32.8895, -68.8458 | Luján de Cuyo |
| LOT-DEMO-002 | Av. San Martín 456 | -32.9100, -68.8350 | Godoy Cruz |
| LOT-DEMO-003 | Sin dirección | -32.8750, -68.8600 | Sin departamento |

Todos los datos son simulados y no tienen valor oficial. El tercer lote demuestra el manejo de datos parciales (campos null).

## Build de producción

```bash
ng build
```

Los archivos se generan en `dist/consulta-lotes-front/`.
