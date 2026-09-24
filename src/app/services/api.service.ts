import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
@Injectable({providedIn:'root'})
export class ApiService {
  private http=inject(HttpClient);
  get<T>(path:string) { return firstValueFrom(this.http.get<T>('/api'+path)); }
  async write<T>(method:string,path:string,body:unknown=null) {
    const csrf=await this.get<{headerName:string;token:string}>('/csrf');
    return firstValueFrom(this.http.request<T>(method,'/api'+path,{body,headers:{[csrf.headerName]:csrf.token}}));
  }
  async login(email:string,password:string) {
    const csrf=await this.get<{headerName:string;token:string}>('/csrf');
    const body=new URLSearchParams({username:email,password}).toString();
    await firstValueFrom(this.http.post('/api/login',body,{headers:new HttpHeaders({[csrf.headerName]:csrf.token,'Content-Type':'application/x-www-form-urlencoded'}),responseType:'text'}));
    return this.get<{email:string;rol:string}>('/admin/me');
  }
  error(error:unknown):string {
    if(error instanceof HttpErrorResponse) {
      if(error.status===0) return 'No se pudo conectar con el servidor. Intentá nuevamente.';
      if(error.status===401) return 'Ingresá con una cuenta administradora. Revisá el correo y la contraseña.';
      if(error.status===403) return 'No tenés permiso o la sesión venció. Volvé a ingresar.';
      const details=error.error?.errores?.map((e:{campo:string;mensaje:string}) => `${e.campo}: ${e.mensaje}`).join('. ');
      return details || error.error?.mensaje || 'No se pudo completar la operación.';
    }
    return 'No se pudo completar la operación.';
  }
}
