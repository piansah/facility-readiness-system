import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function Loading() {
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-500/50 mb-1">
              <Building2 className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Infrastruktur</span>
            </div>
            <Skeleton className="h-8 w-64 bg-slate-800" />
            <Skeleton className="h-4 w-72 mt-2 bg-slate-800" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Sidebar Skeleton */}
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-10 w-full bg-slate-800" />
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full bg-slate-800 rounded-lg" />
              ))}
            </div>
            
            <Card className="border-slate-800 bg-slate-900/40 p-4 space-y-4">
              <Skeleton className="h-4 w-32 bg-slate-800" />
              <Skeleton className="h-10 w-full bg-slate-800" />
              <Skeleton className="h-4 w-24 bg-slate-800" />
              <Skeleton className="h-10 w-full bg-slate-800" />
              <Skeleton className="h-10 w-full bg-emerald-500/20" />
            </Card>
          </div>

          {/* Main Content Skeleton */}
          <div className="lg:col-span-9">
            <Card className="border-slate-800 bg-slate-900/40 overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <Skeleton className="h-6 w-48 bg-slate-800" />
                <Skeleton className="h-6 w-16 bg-slate-800 rounded-full" />
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-4 gap-4 border-b border-slate-800 pb-4">
                  <Skeleton className="h-3 w-20 bg-slate-800" />
                  <Skeleton className="h-3 w-20 bg-slate-800" />
                  <Skeleton className="h-3 w-20 bg-slate-800" />
                  <Skeleton className="h-3 w-10 bg-slate-800 ml-auto" />
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="grid grid-cols-4 gap-4 items-center">
                    <Skeleton className="h-4 w-40 bg-slate-800" />
                    <Skeleton className="h-4 w-24 bg-slate-800" />
                    <Skeleton className="h-4 w-32 bg-slate-800 italic" />
                    <Skeleton className="h-4 w-8 bg-slate-800 ml-auto" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
