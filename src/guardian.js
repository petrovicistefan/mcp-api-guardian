const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];
const own = (o, k) => Object.hasOwn(o ?? {}, k);
export function validate(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new Error('Expected an OpenAPI object');
  if (!/^3\.(0|1)\.\d+$/.test(doc.openapi ?? '')) throw new Error('Only OpenAPI 3.0.x and 3.1.x supported');
  if (!doc.paths || typeof doc.paths !== 'object' || Array.isArray(doc.paths)) throw new Error('paths must be an object');
  return doc;
}
function operations(doc) {
  return Object.entries(doc.paths).flatMap(([path, item]) => methods.filter(m => item?.[m]).map(method => ({path, method, item, op: item[method]})));
}
function refs(value, visit, path = '') {
  if (!value || typeof value !== 'object') return;
  if (typeof value.$ref === 'string') visit(value.$ref, path);
  for (const [k,v] of Object.entries(value)) refs(v, visit, `${path}/${k}`);
}
function resolve(doc, ref) {
  if (!ref.startsWith('#/')) return undefined;
  return ref.slice(2).split('/').reduce((v,k) => own(v, k.replace(/~1/g,'/').replace(/~0/g,'~')) ? v[k.replace(/~1/g,'/').replace(/~0/g,'~')] : undefined, doc);
}
function report(findings, coverage) {
  return {findings, summary: {errors: findings.filter(f=>f.severity==='error').length, warnings: findings.filter(f=>f.severity==='warning').length}, coverage};
}
export function auditOpenApi(input) {
  const doc=validate(input), findings=[], ids=new Set();
  const add=(code,severity,location,message)=>findings.push({code,severity,location,message});
  if (!doc.info?.title || !doc.info?.version) add('MISSING_INFO','error','/info','info.title and info.version are required');
  refs(doc,(ref,path)=>{
    if (!ref.startsWith('#/')) add('EXTERNAL_REF_UNCHECKED','warning',path,'External references are not fetched');
    else if (resolve(doc,ref) === undefined) add('UNRESOLVED_REF','error',path,`Unresolved reference: ${ref}`);
  });
  for (const {path,method,item,op} of operations(doc)) {
    const loc=`${method.toUpperCase()} ${path}`;
    if (!path.startsWith('/')) add('INVALID_PATH','error',loc,'Path must start with /');
    if (!op.operationId) add('MISSING_OPERATION_ID','warning',loc,'Add a stable operationId for agent discovery');
    else if (ids.has(op.operationId)) add('DUPLICATE_OPERATION_ID','error',loc,'operationId must be unique');
    else ids.add(op.operationId);
    if (!op.responses || !Object.keys(op.responses).length) add('MISSING_RESPONSES','error',loc,'Operation must declare responses');
    const security=op.security ?? doc.security;
    if (!security?.length || security.some(s=>Object.keys(s).length===0)) add('PUBLIC_OPERATION','warning',loc,'Contract permits unauthenticated access; verify that this is intentional');
    for (const requirement of security ?? []) for (const scheme of Object.keys(requirement)) {
      if (!own(doc.components?.securitySchemes,scheme)) add('UNKNOWN_SECURITY_SCHEME','error',loc,`Unknown security scheme: ${scheme}`);
    }
    const params=[...(item.parameters??[]),...(op.parameters??[])].map(p=>p.$ref?resolve(doc,p.$ref):p).filter(Boolean);
    for (const name of [...path.matchAll(/\{([^}]+)\}/g)].map(m=>m[1])) {
      if (!params.some(p=>p.in==='path' && p.name===name && p.required===true)) add('MISSING_PATH_PARAMETER','error',loc,`Path parameter ${name} must be declared and required`);
    }
  }
  for (const [name,scheme] of Object.entries(doc.components?.securitySchemes??{})) {
    if (scheme.type==='http' && scheme.scheme==='basic') add('BASIC_AUTH','warning',`securitySchemes/${name}`,'Basic authentication requires TLS and careful credential handling');
    if (scheme.type==='apiKey' && scheme.in==='query') add('QUERY_API_KEY','warning',`securitySchemes/${name}`,'Query keys may leak through URL logs');
  }
  return report(findings,'Static lint checks only; not full OpenAPI validation or a live security assessment');
}
export function compareOpenApi(before,after) {
  validate(before); validate(after);
  const findings=[];
  const add=(code,location,message)=>findings.push({code,severity:'error',location,message});
  for (const {path,method,item,op} of operations(before)) {
    const next=after.paths[path]?.[method], loc=`${method.toUpperCase()} ${path}`;
    if (!next) { add('OPERATION_REMOVED',loc,'Previously available operation removed'); continue; }
    if (op.operationId && next.operationId!==op.operationId) add('OPERATION_ID_CHANGED',loc,'Generated clients or agents may depend on operationId');
    const oldParams=[...(item.parameters??[]),...(op.parameters??[])];
    const newParams=[...(after.paths[path].parameters??[]),...(next.parameters??[])];
    for (const p of newParams) if (p.required && !oldParams.some(q=>q.name===p.name && q.in===p.in && q.required)) add('REQUIRED_PARAMETER_ADDED',loc,`New required parameter: ${p.in}/${p.name}`);
    if (next.requestBody?.required && !op.requestBody?.required) add('REQUEST_BODY_REQUIRED',loc,'Request body became required');
    for (const status of Object.keys(op.responses??{})) if (!own(next.responses,status)) add('RESPONSE_REMOVED',loc,`Response ${status} removed`);
    if (JSON.stringify(op.security??before.security??[])!==JSON.stringify(next.security??after.security??[])) findings.push({code:'SECURITY_CHANGED',severity:'warning',location:loc,message:'Authentication requirements changed; review compatibility'});
  }
  return report(findings,'Operation, operationId, inline required parameters, request body requirement, response codes and security changes. Schema compatibility and referenced parameter changes are not checked.');
}
