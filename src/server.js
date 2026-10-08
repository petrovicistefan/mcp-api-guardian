#!/usr/bin/env node
import readline from 'node:readline';
import {auditOpenApi,compareOpenApi} from './guardian.js';
const tools=[
  {name:'audit_openapi',description:'Static OpenAPI 3.0/3.1 lint and authentication declaration review. Does not call endpoints.',inputSchema:{type:'object',properties:{spec:{type:'object'}},required:['spec'],additionalProperties:false}},
  {name:'compare_openapi',description:'Find selected breaking changes between two OpenAPI documents; not exhaustive schema compatibility.',inputSchema:{type:'object',properties:{before:{type:'object'},after:{type:'object'}},required:['before','after'],additionalProperties:false}}
];
const send=value=>process.stdout.write(JSON.stringify(value)+'\n');
const error=(id,code,message)=>send({jsonrpc:'2.0',id,error:{code,message}});
let initialized=false;
for await (const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity})) {
  let req;
  try { if (Buffer.byteLength(line)>8*1024*1024) throw new Error('Message exceeds 8 MiB'); req=JSON.parse(line); }
  catch { error(null,-32700,'Invalid JSON or oversized message'); continue; }
  if (!req || req.jsonrpc!=='2.0' || typeof req.method!=='string') {error(req?.id??null,-32600,'Invalid request');continue;}
  if (!Object.hasOwn(req,'id')) continue;
  let result;
  if (req.method==='initialize') {
    initialized=true;
    const supported=['2025-11-25','2025-06-18','2025-03-26','2024-11-05'];
    result={protocolVersion:supported.includes(req.params?.protocolVersion)?req.params.protocolVersion:'2025-11-25',capabilities:{tools:{}},serverInfo:{name:'mcp-api-guardian',version:'0.1.1'}};
  } else if (req.method==='ping') result={};
  else if (!initialized) {error(req.id,-32000,'Initialize first');continue;}
  else if (req.method==='tools/list') result={tools};
  else if (req.method==='tools/call') {
    try {
      const {name,arguments:args}=req.params??{};
      let report;
      if (name==='audit_openapi') report=auditOpenApi(args?.spec);
      else if (name==='compare_openapi') report=compareOpenApi(args?.before,args?.after);
      else {error(req.id,-32602,'Unknown tool');continue;}
      result={content:[{type:'text',text:JSON.stringify(report,null,2)}],isError:false};
    } catch (e) {result={content:[{type:'text',text:e.message}],isError:true};}
  } else {error(req.id,-32601,'Method not found');continue;}
  send({jsonrpc:'2.0',id:req.id,result});
}
