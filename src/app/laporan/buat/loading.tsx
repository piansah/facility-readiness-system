import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 bg-slate-800" />
          <Skeleton className="h-4 w-96 bg-slate-800" />
        </div>

        {/* Form Card Skeleton */}
        <Card className="border-slate-800 bg-slate-900/40 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 bg-slate-800" />
              <Skeleton className="h-10 w-full bg-slate-800" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 bg-slate-800" />
              <Skeleton className="h-10 w-full bg-slate-800" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-32 bg-slate-800" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full bg-slate-800 rounded-lg" />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-24 bg-slate-800" />
            <Skeleton className="h-32 w-full bg-slate-800" />
          </div>

          <Skeleton className="h-12 w-full bg-emerald-500/20" />
        </Card>
      </div>
    </main>
  );
}
