import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 bg-slate-800" />
            <Skeleton className="h-4 w-96 bg-slate-800" />
          </div>
          <Skeleton className="h-10 w-48 bg-slate-800" />
        </div>

        {/* Filter Bar */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-24 flex-shrink-0 bg-slate-800 rounded-full" />
          ))}
        </div>

        {/* Reports Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-slate-800 bg-slate-900/40 overflow-hidden">
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-5 w-32 bg-slate-800" />
                  <Skeleton className="h-6 w-16 rounded-full bg-slate-800" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full bg-slate-800" />
                  <Skeleton className="h-4 w-2/3 bg-slate-800" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full bg-slate-800" />
                  <Skeleton className="h-3 w-24 bg-slate-800" />
                </div>
                <div className="pt-2">
                  <Skeleton className="h-10 w-full bg-blue-500/10" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
