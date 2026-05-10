export default function Loading() {
  return (
    <div className="min-h-dvh bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="relative flex items-center justify-center mb-8">
        <div className="h-24 w-24 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-pulse">
           <img src="/icon.png" alt="FRS Logo" className="w-full h-full object-cover" />
        </div>
        <div className="absolute -inset-4 rounded-[40px] border border-emerald-500/20 animate-ping opacity-20" />
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
