export default function Loading() {
  return (
    <div className="min-h-dvh bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="relative flex items-center justify-center mb-8">
        <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 animate-pulse flex items-center justify-center">
           <span className="text-3xl font-black text-emerald-500 opacity-50">F</span>
        </div>
        <div className="absolute inset-0 h-20 w-20 rounded-2xl border-t-2 border-emerald-500 animate-spin" />
      </div>
      
      <div className="space-y-3 w-full max-w-xs">
        <div className="h-4 bg-slate-800 rounded-full w-3/4 mx-auto animate-pulse" />
        <div className="h-3 bg-slate-900 rounded-full w-1/2 mx-auto animate-pulse" />
      </div>
      
      <p className="mt-8 text-xs font-bold uppercase tracking-[0.3em] text-slate-500 animate-pulse">
        Sistem Sedang Menyiapkan Data
      </p>
    </div>
  );
}
