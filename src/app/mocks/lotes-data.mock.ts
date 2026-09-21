/* ====================================================================
 *  Datos locales temporales — SIMULADOS
 *  Estos datos NO son oficiales ni tienen valor legal.
 *  Se usan como placeholder hasta integrar la API real del backend.
 *  Fuente: Dataset demostrativo F-01 (frontend)
 * ==================================================================== */

import { FichaLoteResponse, ProcedenciaResponse } from '../models/ficha-lote.model';

const PROCEDENCIA_SIMULADA: ProcedenciaResponse = {
  tipo: 'SIMULADO',
  fuente: 'Dataset demostrativo F-01',
  oficial: false
};

/**
 * Lotes demostrativos indexados por identificador.
 * Al integrar la API real, este archivo se deja de usar
 * y loteService.ts pasa a llamar al backend.
 */
export const LOTES_MOCK: FichaLoteResponse[] = [
  {
    criterioConsulta: {
      tipo: 'IDENTIFICADOR',
      identificador: 'LOT-DEMO-001',
      latitud: null,
      longitud: null
    },
    lote: {
      identificador: 'LOT-DEMO-001',
      direccionAproximada: 'Calle Demostración 123, Mendoza',
      departamento: 'Luján de Cuyo',
      coordenadas: { latitud: -32.8895, longitud: -68.8458 },
      procedencia: PROCEDENCIA_SIMULADA
    },
    zonificacion: {
      descripcion: 'Residencial R2 (dato simulado)',
      verificada: false,
      procedencia: PROCEDENCIA_SIMULADA
    },
    infraestructuraElectrica: {
      distanciaRedElectricaMts: 320.0,
      tieneAcceso: true,
      procedencia: PROCEDENCIA_SIMULADA
    },
    coberturaAgua: {
      tieneCobertura: true,
      procedencia: PROCEDENCIA_SIMULADA
    },
    advertencia: 'La información de esta ficha es demostrativa y no constituye información catastral, municipal ni legal oficial.',
    dondeConsultar: {
      departamento: 'Luján de Cuyo',
      contacto: 'Contacto demostrativo no oficial',
      direccionOficina: 'Oficina demostrativa',
      comoConsultar: 'Consultar la zonificación ante el organismo municipal competente',
      procedencia: PROCEDENCIA_SIMULADA
    }
  },
  {
    criterioConsulta: {
      tipo: 'IDENTIFICADOR',
      identificador: 'LOT-DEMO-002',
      latitud: null,
      longitud: null
    },
    lote: {
      identificador: 'LOT-DEMO-002',
      direccionAproximada: 'Av. San Martín 456, Mendoza',
      departamento: 'Godoy Cruz',
      coordenadas: { latitud: -32.9100, longitud: -68.8350 },
      procedencia: PROCEDENCIA_SIMULADA
    },
    zonificacion: {
      descripcion: 'Comercial C1 (dato simulado)',
      verificada: false,
      procedencia: PROCEDENCIA_SIMULADA
    },
    infraestructuraElectrica: {
      distanciaRedElectricaMts: 150.0,
      tieneAcceso: true,
      procedencia: PROCEDENCIA_SIMULADA
    },
    coberturaAgua: {
      tieneCobertura: true,
      procedencia: PROCEDENCIA_SIMULADA
    },
    advertencia: 'La información de esta ficha es demostrativa y no constituye información catastral, municipal ni legal oficial.',
    dondeConsultar: {
      departamento: 'Godoy Cruz',
      contacto: 'Contacto demostrativo no oficial',
      direccionOficina: 'Oficina demostrativa',
      comoConsultar: 'Consultar la zonificación ante el organismo municipal competente',
      procedencia: PROCEDENCIA_SIMULADA
    }
  },
  {
    criterioConsulta: {
      tipo: 'IDENTIFICADOR',
      identificador: 'LOT-DEMO-003',
      latitud: null,
      longitud: null
    },
    lote: {
      identificador: 'LOT-DEMO-003',
      direccionAproximada: null,
      departamento: null,
      coordenadas: { latitud: -32.8750, longitud: -68.8600 },
      procedencia: PROCEDENCIA_SIMULADA
    },
    zonificacion: {
      descripcion: null,
      verificada: false,
      procedencia: PROCEDENCIA_SIMULADA
    },
    infraestructuraElectrica: {
      distanciaRedElectricaMts: null,
      tieneAcceso: false,
      procedencia: PROCEDENCIA_SIMULADA
    },
    coberturaAgua: {
      tieneCobertura: false,
      procedencia: PROCEDENCIA_SIMULADA
    },
    advertencia: 'La información de esta ficha es demostrativa y no constituye información catastral, municipal ni legal oficial.',
    dondeConsultar: null
  }
];
