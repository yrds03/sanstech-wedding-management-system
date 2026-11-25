import {headers} from 'next/headers';
export async function getAppOrigin():Promise<string> {
  const configured=process.env.NEXT_PUBLIC_APP_URL;
  if(configured){try{const url=new URL(configured);if(url.protocol==='https:' || (process.env.NODE_ENV!=='production'&&url.protocol==='http:'))return url.origin;}catch{ /* Use the deployment hostname when configuration is invalid. */ }}
  const deployed=process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if(deployed && /^[a-z0-9.-]+$/i.test(deployed))return `https://${deployed}`;
  const requestHeaders=await headers();
  const host=requestHeaders.get('host')??'localhost:3000';
  return `${process.env.NODE_ENV==='production'?'https':'http'}://${host}`;
}
