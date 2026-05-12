import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      {/* Top Navbar Skeleton */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50 px-4 h-16 flex items-center justify-between">
        <Skeleton className="h-8 w-32 bg-slate-800" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full bg-slate-800" />
          <Skeleton className="h-8 w-24 bg-slate-800" />
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 bg-slate-800" />
          <Skeleton className="h-4 w-48 bg-slate-800" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-slate-800 bg-slate-900/40">
              <CardHeader className="p-4 space-y-2">
                <Skeleton className="h-3 w-20 bg-slate-800" />
                <Skeleton className="h-8 w-12 bg-slate-800" />
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full bg-emerald-500/10 border border-emerald-500/20 rounded-xl" />
          <Skeleton className="h-24 w-full bg-blue-500/10 border border-blue-500/20 rounded-xl" />
        </div>

        {/* Recent Reports Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-40 bg-slate-800" />
            <Skeleton className="h-4 w-20 bg-slate-800" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-slate-800 bg-slate-900/40">
                <div className="p-4 flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-64 bg-slate-800" />
                    <Skeleton className="h-3 w-32 bg-slate-800" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full bg-slate-800" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
