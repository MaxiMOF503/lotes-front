const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../src/app/components/informe-parcelas/informe-documento.ts'),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exportsInforme={};vm.runInNewContext(compiled,{exports:exportsInforme});
const {documentoInforme,parcelasInforme,filasParcela}=exportsInforme;
const fecha='2026-10-11T15:00:00Z';
function informe(){return {generadoEn:fecha,fechaConsulta:fecha,historico:false,parcelaId:'real.1',consulta:{latitud:-33,longitud:-68.8,parcelas:[{id:'real.1',properties:{nomenclatu:'060406',suptotal:0,observaciones:'<img src=x onerror="alert(1)">'}}],hayMasParcelas:false,dentroRadioAgua:false,electricidad:{distanciaMetros:null,tipo:null,radioBusquedaMetros:1000,alcance:'No acredita conexión'},fuentes:[{capa:'catastro',fuente:'Municipal',url:'https://ejemplo.invalid',importadoEn:fecha}],advertencia:'No acredita dominio'},aportes:[]};}
test('Los textos de fuentes y aportes no se ejecutan como HTML',()=>{
 const i=informe();i.aportes=[{parcelaId:'real.1',ficha:{observaciones:'</script><script>alert(1)</script>',fuente:'A & B',referencia:'" onclick="alert(1)',actualizadoEn:fecha}}];
 const html=documentoInforme([i]);assert.ok(!html.includes('<img src=x'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('A &amp; B'));assert.ok(html.includes('&quot; onclick=&quot;'));
});
test('Un informe de guardada selecciona la parcela correcta en los límites',()=>{
 const i=informe();i.consulta.parcelas.unshift({id:'vecina',properties:{nomenclatu:'999999'}});
 assert.equal(parcelasInforme(i).length,1);assert.equal(parcelasInforme(i)[0].id,'real.1');assert.ok(!documentoInforme([i]).includes('999999'));
 i.parcelaId=null;assert.equal(parcelasInforme(i).length,2);
});
test('Cero y ausencia de tramo no se confunden con información positiva',()=>{
 const i=informe();assert.equal(filasParcela(i.consulta.parcelas[0]).find(f=>f.etiqueta==='Superficie publicada (m²)').valor,'0');
 const html=documentoInforme([i]);assert.ok(html.includes('Fuera del radio publicado'));assert.ok(html.includes('Sin tramo encontrado dentro del radio'));assert.ok(html.includes('No acredita dominio'));
});
test('El documento autónomo incluye fecha histórica, fuentes y advertencias',()=>{
 const i=informe();i.historico=true;const html=documentoInforme([i,i],true);
 assert.ok(html.includes('Copia histórica'));assert.ok(html.includes('https://ejemplo.invalid'));assert.ok(html.includes('Documento generado'));assert.ok(html.includes('Comparación · 2'));
 assert.equal((html.match(/<script>/g)||[]).length,1);assert.ok(!html.includes('<link'));assert.ok(!html.includes('<img'));
});
