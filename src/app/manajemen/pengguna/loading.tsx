import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function Loading() {
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-500/50 mb-1">
              <Shield className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Administrator</span>
            </div>
            <Skeleton className="h-8 w-64 bg-slate-800" />
            <Skeleton className="h-4 w-48 mt-2 bg-slate-800" />
          </div>
          <Skeleton className="h-10 w-32 bg-slate-800" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-slate-800 bg-slate-900/40">
              <CardHeader className="p-4 pb-2 space-y-2">
                <Skeleton className="h-3 w-20 bg-slate-800" />
                <Skeleton className="h-7 w-12 bg-slate-800" />
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Table Skeleton */}
        <Card className="border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="space-y-4 p-6">
            <div className="flex justify-between border-b border-slate-800 pb-4">
              <Skeleton className="h-4 w-24 bg-slate-800" />
              <Skeleton className="h-4 w-16 bg-slate-800" />
              <Skeleton className="h-4 w-24 bg-slate-800" />
              <Skeleton className="h-4 w-16 bg-slate-800" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40 bg-slate-800" />
                  <Skeleton className="h-3 w-24 bg-slate-800" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full bg-slate-800" />
                <Skeleton className="h-4 w-20 bg-slate-800" />
                <Skeleton className="h-6 w-12 bg-slate-800" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
