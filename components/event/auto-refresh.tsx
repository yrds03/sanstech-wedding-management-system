'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
export function AutoRefresh(){const router=useRouter();useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)router.refresh();},5000);return()=>clearInterval(timer);},[router]);return <p className="text-sm text-ink/65">Diperbarui setiap 5 detik saat halaman aktif.</p>;}
