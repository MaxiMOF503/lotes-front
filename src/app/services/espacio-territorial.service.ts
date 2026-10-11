import {Injectable,inject} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {ApiService} from './api.service';
import {ElementoTerritorial} from '../models/territorio.model';
import {Guardada,PaginaEspacio,FichaComplementaria,SeleccionParcela,ConsultaHistorial,InformeTerritorial} from '../models/espacio-territorial.model';

@Injectable({providedIn:'root'})
export class EspacioTerritorialService {
  private api=inject(ApiService);
  historial(pagina=0){return this.api.get<PaginaEspacio<ConsultaHistorial>>('/mi-espacio/historial?pagina='+pagina);}
  informeHistorico(id:number){return this.api.get<InformeTerritorial>('/mi-espacio/historial/'+id+'/informe');}
  quitarHistorial(id:number){return this.api.write<void>('DELETE','/mi-espacio/historial/'+id);}
  informeGuardada(id:number){return this.api.get<InformeTerritorial>('/mi-espacio/guardadas/'+id+'/informe');}
  comparar(ids:number[]){return this.api.get<InformeTerritorial[]>('/mi-espacio/comparacion?ids='+ids.join(','));}
  readonly seleccion=new BehaviorSubject<SeleccionParcela|null>(null);
  parcela(id:string){return this.api.get<ElementoTerritorial>('/public/v1/territorio/parcelas/'+encodeURIComponent(id));}
  buscar(nomenclatura:string,pagina=0){return this.api.get<{items:ElementoTerritorial[];pagina:number;hayMas:boolean}>('/public/v1/territorio/parcelas?nomenclatura='+encodeURIComponent(nomenclatura.trim())+'&pagina='+pagina);}
  guardadas(pagina=0){return this.api.get<PaginaEspacio<Guardada>>('/mi-espacio/guardadas?pagina='+pagina);}
  guardar(id:string,latitud:number,longitud:number,etiqueta:string|null=null){return this.api.write<Guardada>('PUT','/mi-espacio/guardadas/'+encodeURIComponent(id),{latitud,longitud,etiqueta});}
  quitar(id:number){return this.api.write<void>('DELETE','/mi-espacio/guardadas/'+id);}
  fichas(pagina=0){return this.api.get<PaginaEspacio<FichaComplementaria>>('/admin/parcelas/fichas?pagina='+pagina);}
  ficha(id:string){return this.api.get<FichaComplementaria>('/admin/parcelas/'+encodeURIComponent(id)+'/ficha');}
  guardarFicha(ficha:FichaComplementaria){const {direccion,observaciones,fuente,referencia,version}=ficha;return this.api.write<FichaComplementaria>('PUT','/admin/parcelas/'+encodeURIComponent(ficha.parcelaId)+'/ficha',{direccion,observaciones,fuente,referencia,version});}
}
