'use client';

import { useEffect, useState, useRef } from 'react';

interface DisplayStatePayload {
  eventTitle: string;
  brideName: string;
  groomName: string;
  venue: string;
  totalCheckedInPersons: number;
  welcomeGuest: {
    id: string;
    displayName: string;
    guestCategory: string;
    tableLabelOptional: string | null;
  } | null;
  lastUpdatedIso: string;
}

export function LiveDisplayClient({
  sessionId,
  initialState,
}: {
  sessionId: string;
  initialState: DisplayStatePayload;
}) {
  const [state, setState] = useState<DisplayStatePayload>(initialState);
  const [connectionStatus, setConnectionStatus] = useState<'LIVE' | 'RECONNECTING'>('LIVE');
  const [lastTriggerFlash, setLastTriggerFlash] = useState(false);
  const lastWelcomeId = useRef(initialState.welcomeGuest?.id ?? null);
  const welcomeId=state.welcomeGuest?.id;

  useEffect(() => {
    let active = true;
    let timer:ReturnType<typeof setTimeout>;
    let flashTimer:ReturnType<typeof setTimeout>;
    let pending:AbortController|null=null;

    async function pollDisplayState() {
      try {
        const controller=new AbortController();pending=controller;
        const timeout=setTimeout(()=>controller.abort(),8000);
        const res = await fetch(`/api/display/${encodeURIComponent(sessionId)}/state`, {
          cache: 'no-store',
          signal: controller.signal,
        }).finally(()=>clearTimeout(timeout));
        if (!res.ok) {
          if (active) setConnectionStatus('RECONNECTING');
          return;
        }
        const nextData = (await res.json()) as DisplayStatePayload;
        if (!active) return;

        setConnectionStatus('LIVE');
        if(nextData.welcomeGuest?.id && nextData.welcomeGuest.id!==lastWelcomeId.current){
          lastWelcomeId.current=nextData.welcomeGuest.id;setLastTriggerFlash(true);
          clearTimeout(flashTimer);flashTimer=setTimeout(()=>{if(active)setLastTriggerFlash(false);},1200);
        }
        setState(nextData);
      } catch {
        if (active) setConnectionStatus('RECONNECTING');
      } finally {
        if(active)timer=setTimeout(pollDisplayState,2500);
      }
    }

    timer=setTimeout(pollDisplayState,2500);
    return () => {
      active = false;
      clearTimeout(timer);clearTimeout(flashTimer);pending?.abort();
    };
  }, [sessionId]);
  useEffect(()=>{
    if(!welcomeId)return;
    const timer=setTimeout(()=>setState(previous=>({...previous,welcomeGuest:null})),8000);
    return ()=>clearTimeout(timer);
  },[welcomeId]);

  return (
    <div
      className={`min-h-screen flex flex-col justify-between bg-gradient-to-b from-navy-dark via-navy to-navy-dark text-ivory p-8 sm:p-14 text-center select-none transition-all duration-700 ${
        lastTriggerFlash ? 'ring-8 ring-gold/70' : ''
      }`}
    >
      {/* Top Status Bar */}
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-gold-light/85 border-b border-gold/25 pb-4">
        <span>SANSTECH ROYAL WELCOME SCREEN · {state.venue.toUpperCase()}</span>
        <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-navy-dark/80 px-3 py-1 text-[10px]">
          <span
            className={`h-2 w-2 rounded-full ${
              connectionStatus === 'LIVE' ? 'bg-success animate-ping' : 'bg-warning'
            }`}
          />
          {connectionStatus === 'LIVE'
            ? 'AUTO-SYNC AKTIF (REALTIME 2.5 DETIK)'
            : 'MENYAMBUNG ULANG...'}
        </span>
      </div>

      {/* Main Welcome Frame */}
      <div className="my-auto max-w-5xl mx-auto space-y-6 py-8">
        <p className="text-xs sm:text-sm uppercase tracking-[0.4em] text-gold-light">
          THE ROYAL WEDDING CELEBRATION OF
        </p>
        <h1 className="font-serif text-5xl sm:text-7xl font-bold text-white tracking-wide">
          {state.brideName} &amp; {state.groomName}
        </h1>
        <div className="my-6 h-0.5 w-48 bg-gold/60 mx-auto" />

        {state.welcomeGuest ? (
          <div className="rounded-card border-2 border-gold/60 bg-navy-dark/70 px-8 py-10 shadow-2xl space-y-4">
            <span className="inline-block rounded-full bg-gold/20 border border-gold/50 px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-gold-light">
              {state.welcomeGuest.guestCategory === 'vvip'
                ? '✦ TAMU KEHORMATAN VVIP ✦'
                : state.welcomeGuest.guestCategory === 'vip'
                ? '✦ TAMU VIP ✦'
                : '✦ SELAMAT DATANG ✦'}
            </span>
            <p className="text-sm uppercase tracking-[0.25em] text-ivory/80">
              Selamat Datang Bapak / Ibu / Keluarga
            </p>
            <h2 className="font-serif text-4xl sm:text-6xl font-bold text-gold-light leading-tight">
              {state.welcomeGuest.displayName}
            </h2>
            {state.welcomeGuest.tableLabelOptional && (
              <p className="text-lg sm:text-2xl text-white/95 font-medium pt-2">
                Silakan Menuju <strong className="text-gold-light">{state.welcomeGuest.tableLabelOptional}</strong>
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-card border border-gold/30 bg-navy-dark/40 px-8 py-10 space-y-3">
            <h2 className="font-serif italic text-3xl sm:text-5xl text-gold-light">
              Selamat Datang Tamu Undangan Kehormatan
            </h2>
            <p className="text-sm sm:text-base text-ivory/75">
              Silakan pindai Kode QR undangan Anda pada meja registrasi untuk menampilkan sambutan
              otomatis di layar ini.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-widest text-ivory/45 border-t border-gold/20 pt-4">
        <span>PRIVACY GUARD ACTIVE · NAMA TAMU NON-PUBLIK DISEMBUNYIKAN OTOMATIS</span>
        <span>TOTAL TAMU TERKONFIRMASI HADIR: {state.totalCheckedInPersons} ORANG</span>
      </div>
    </div>
  );
}

