/** Procedencia de un dato mostrado en la ficha: oficial o no, y de qué fuente sale. */
export interface ProcedenciaResponse {
  tipo: string;           // 'OFICIAL'
  fuente: string | null;  // nombre de la fuente publicada
  oficial: boolean;
}
