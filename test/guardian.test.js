import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {auditOpenApi,compareOpenApi} from '../src/guardian.js';
const spec=()=>({openapi:'3.1.0',info:{title:'Demo',version:'1'},security:[{bearer:[]}],components:{securitySchemes:{bearer:{type:'http',scheme:'bearer'}}},paths:{'/users/{id}':{get:{operationId:'getUser',parameters:[{name:'id',in:'path',required:true}],responses:{200:{description:'OK'}}}}}});
test('valid contract passes supported checks',()=>assert.deepEqual(auditOpenApi(spec()).summary,{errors:0,warnings:0}));
test('detect public override, missing parameter and dangling ref',()=>{
  const s=spec(); s.paths['/users/{id}'].get.security=[];s.paths['/users/{id}'].get.parameters=[];s.components.schemas={X:{$ref:'#/components/schemas/Missing'}};
  const codes=auditOpenApi(s).findings.map(f=>f.code);
  for(const c of ['PUBLIC_OPERATION','MISSING_PATH_PARAMETER','UNRESOLVED_REF']) assert.ok(codes.includes(c));
});
test('detect operation removal',()=>{const b=spec(),a=spec();a.paths={};assert.equal(compareOpenApi(b,a).findings[0].code,'OPERATION_REMOVED');});
test('detect added required parameter and removed response',()=>{const b=spec(),a=spec();a.paths['/users/{id}'].get.parameters.push({name:'tenant',in:'header',required:true});a.paths['/users/{id}'].get.responses={};assert.equal(compareOpenApi(b,a).summary.errors,2);});
test('reject unsupported input',()=>assert.throws(()=>auditOpenApi({openapi:'2.0',paths:{}})));
test('stdio initialize, discover and invoke with recoverable tool error',()=>{
  const messages=[{id:1,method:'initialize',params:{protocolVersion:'2025-03-26'}},{method:'notifications/initialized'},{id:2,method:'tools/list'},{id:3,method:'tools/call',params:{name:'audit_openapi',arguments:{spec:spec()}}},{id:4,method:'tools/call',params:{name:'audit_openapi',arguments:{}}}];
  const p=spawnSync(process.execPath,['src/server.js'],{input:messages.map(m=>JSON.stringify({jsonrpc:'2.0',...m})).join('\n')+'\n',encoding:'utf8'});
  assert.equal(p.status,0); const lines=p.stdout.trim().split('\n').map(JSON.parse);assert.equal(lines.length,4);assert.equal(lines[0].result.protocolVersion,'2025-03-26');assert.equal(lines[1].result.tools.length,2);assert.equal(lines[2].result.isError,false);assert.equal(lines[3].result.isError,true);
});
