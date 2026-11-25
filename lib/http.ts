import {NextResponse} from 'next/server';
export class RequestError extends Error {
  constructor(public readonly status:number,public readonly code:string,message:string){super(message);}
}
async function boundedBody(request:Request):Promise<Uint8Array> {
  const reader=request.body?.getReader();
  if(!reader) throw new RequestError(400,'VALIDATION_ERROR','Data permintaan kosong.');
  const chunks:Uint8Array[]=[];let size=0;
  try {
    while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;
      if(size>5*1024*1024){await reader.cancel();throw new RequestError(413,'PAYLOAD_TOO_LARGE','Ukuran permintaan maksimal 5 MB.');}
      chunks.push(part.value);
    }
  } finally {reader.releaseLock();}
  const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}return data;
}
export async function readFormBody(request:Request):Promise<FormData> {
  const data=await boundedBody(request);
  try {return await new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('content-type')??''},body:data as BodyInit}).formData();}
  catch {throw new RequestError(400,'VALIDATION_ERROR','Format formulir tidak valid.');}
}
export async function readJsonBody(request:Request):Promise<Record<string,unknown>> {
  const data=await boundedBody(request);
  try {const parsed:unknown=JSON.parse(new TextDecoder().decode(data));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error();return parsed as Record<string,unknown>;}
  catch {throw new RequestError(400,'VALIDATION_ERROR','Format JSON tidak valid.');}
}
export function routeError(error:unknown) {
  if(error instanceof RequestError)return NextResponse.json({error:{code:error.code,message:error.message}},{status:error.status});
  console.error('request_failed',{name:error instanceof Error?error.name:'unknown'});
  return NextResponse.json({error:{code:'SERVICE_UNAVAILABLE',message:'Layanan belum dapat memproses permintaan. Coba lagi sebentar.'}},{status:503});
}
