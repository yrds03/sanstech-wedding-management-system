import Link from 'next/link';
export function pageWindow(total:number,size:number,value:string|undefined){const pages=Math.max(1,Math.ceil(total/size));const page=Math.min(pages,Math.max(1,Number.isFinite(Number(value))?Math.floor(Number(value)):1));return {page,pages,start:(page-1)*size,end:page*size};}
export function Pagination({page,pages,path,query={}}:{page:number;pages:number;path:string;query?:Record<string,string|undefined>}){
 if(pages<=1)return null;
 const href=(target:number)=>{const params=new URLSearchParams();Object.entries(query).forEach(([key,value])=>{if(value)params.set(key,value);});params.set('page',String(target));return `${path}?${params}`;};
 return <nav aria-label="Navigasi halaman" className="flex flex-wrap items-center gap-4 py-4 text-sm">{page>1&&<Link className="rounded border px-4 py-2" href={href(page-1)}>Sebelumnya</Link>}<span>Halaman {page} dari {pages}</span>{page<pages&&<Link className="rounded border px-4 py-2" href={href(page+1)}>Berikutnya</Link>}</nav>;
}
