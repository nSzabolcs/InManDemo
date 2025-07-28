import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  //private baseUrl = 'http://localhost:3000/api';
 
  private baseUrl = 'https://sugo-media.hu/InManDemo/api';
  //private baseUrl = 'http://localhost/InManDemo/api';

  constructor(private http: HttpClient) {}

  select(table: string, id: number | string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${table}/${id}`);
  }

  selectAll(table: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${table}`);
  }

  insert(table: string, value: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/${table}`, value);
  }

  update(table: string, id: number | string, value: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${table}/${id}`, value);
  }

  delete(table: string, id: number | string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${table}/${id}`);
  }

}
