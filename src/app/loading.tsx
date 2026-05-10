export default function Loading() {
  return (
    <div className="min-h-dvh bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="relative flex items-center justify-center mb-8">
        {/* Kotak F Minimalis Ikonik */}
        <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 animate-pulse flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.1)]">
           <span className="text-3xl font-black text-emerald-500 opacity-60">F</span>
        </div>
        
        {/* Ring Animasi */}
        <div className="absolute inset-0 h-20 w-20 rounded-2xl border-t-2 border-emerald-500 animate-spin" />
      </div>
      
      <div className="space-y-3 w-full max-w-[120px]">
        <div className="h-1 bg-slate-800 rounded-full w-full overflow-hidden">
          <div className="h-full bg-emerald-500 w-1/3 animate-[loading_1.5s_infinite_linear]" />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}} />
      
      <p className="mt-8 text-[9px] font-bold uppercase tracking-[0.4em] text-slate-600">
        Menyiapkan Sistem
      </p>
    </div>
  );
}
