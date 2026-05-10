export default function Loading() {
  return (
    <div className="min-h-dvh bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="relative flex items-center justify-center mb-8">
        {/* Logo FRS pakai SVG murni */}
        <div className="relative z-10 animate-pulse">
          <svg
            width="120"
            height="40"
            viewBox="0 0 120 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fill="white"
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 900,
                fontSize: "32px",
                letterSpacing: "-0.05em",
              }}
            >
              FRS
            </text>
          </svg>
        </div>
        
        {/* Efek Glow di belakang */}
        <div className="absolute inset-0 bg-emerald-500/20 blur-[40px] rounded-full animate-pulse" />
      </div>
      
      <div className="space-y-3 w-full max-w-xs">
        <div className="h-1 bg-slate-800 rounded-full w-full overflow-hidden">
          <div className="h-full bg-emerald-500 w-1/3 animate-[loading_1.5s_infinite_linear]" />
        </div>
      </div>

      <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
      
      <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500">
        Menyiapkan Sistem
      </p>
    </div>
  );
}
