import React from 'react';

export default function LoadingAnimation() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="relative flex items-center justify-center">
        {/* Outer Glow */}
        <div className="absolute h-24 w-24 animate-pulse rounded-full bg-emerald-500/20 blur-xl"></div>
        
        {/* Rotating Ring */}
        <div className="h-20 w-20 animate-spin rounded-full border-b-2 border-t-2 border-emerald-500"></div>
        
        {/* Center Logo/Icon placeholder */}
        <div className="absolute flex flex-col items-center">
          <div className="h-10 w-10 animate-bounce">
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="text-emerald-500"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Text Animation */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <h2 className="text-lg font-bold tracking-widest text-slate-100 uppercase animate-pulse">
          Memuat Data
        </h2>
        <div className="flex gap-1">
          <div className="h-1 w-1 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.3s]"></div>
          <div className="h-1 w-1 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.15s]"></div>
          <div className="h-1 w-1 animate-bounce rounded-full bg-emerald-500"></div>
        </div>
      </div>
    </div>
  );
}
