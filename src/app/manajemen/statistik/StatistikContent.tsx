"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Users, CheckCircle2, AlertCircle, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type IncidentData = {
  id: string;
  result_status: string | null;
  handler_type: string | null;
  incident_time: string;
  facilities: { name: string } | null;
};

type Props = {
  initialData: IncidentData[];
  unitName: string;
};

const COLORS = {
  success: "#10b981", // emerald-500
  pending: "#f59e0b", // amber-500
  failed: "#ef4444",  // red-500
  internal: "#6366f1", // indigo-500
  vendor: "#3b82f6",   // blue-500
};

export default function StatistikContent({ initialData, unitName }: Props) {
  // 1. Process Data for Result Pie Chart
  const resultData = useMemo(() => {
    const counts = initialData.reduce((acc, curr) => {
      const status = curr.result_status || "pending";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: "Berhasil", value: counts.success || 0, color: COLORS.success },
      { name: "Pending", value: counts.pending || 0, color: COLORS.pending },
      { name: "Gagal", value: counts.failed || 0, color: COLORS.failed },
    ].filter(d => d.value > 0);
  }, [initialData]);

  // 2. Process Data for Handler Bar Chart
  const handlerData = useMemo(() => {
    const counts = initialData.reduce((acc, curr) => {
      const handler = curr.handler_type || "internal";
      acc[handler] = (acc[handler] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: "Internal", value: counts.internal || 0, color: COLORS.internal },
      { name: "Vendor", value: counts.vendor || 0, color: COLORS.vendor },
    ];
  }, [initialData]);

  // 3. Process Vendor Leaderboard (Success Rate per Vendor/Team)
  const leaderboardData = useMemo(() => {
    const groups = initialData.reduce((acc, curr) => {
      const key = curr.handler_type === 'vendor' ? 'Vendor' : 'Internal';
      if (!acc[key]) acc[key] = { total: 0, success: 0 };
      acc[key].total++;
      if (curr.result_status === 'success') acc[key].success++;
      return acc;
    }, {} as Record<string, { total: number; success: number }>);

    return Object.entries(groups).map(([name, stats]) => ({
      name,
      rate: Math.round((stats.success / stats.total) * 100),
      total: stats.total,
      color: name === 'Vendor' ? COLORS.vendor : COLORS.internal
    })).sort((a, b) => b.rate - a.rate);
  }, [initialData]);

  // 4. Process Trends (last 7 days)
  const trendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    const dailyCounts = initialData.reduce((acc, curr) => {
      const date = curr.incident_time.split("T")[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return last7Days.map(date => ({
      date: new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      jumlah: dailyCounts[date] || 0
    }));
  }, [initialData]);

  // 4. Calculate KPIs
  const kpis = useMemo(() => {
    const total = initialData.length;
    const success = initialData.filter(d => d.result_status === 'success').length;
    const rate = total > 0 ? Math.round((success / total) * 100) : 0;
    const vendorCount = initialData.filter(d => d.handler_type === 'vendor').length;

    return [
      { label: "Total Insiden", value: total, icon: BarChart3, color: "text-blue-400", bg: "bg-blue-500/10" },
      { label: "Success Rate", value: `${rate}%`, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
      { label: "Bantuan Vendor", value: vendorCount, icon: Users, color: "text-purple-400", bg: "bg-purple-500/10" },
    ];
  }, [initialData]);

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:py-4">
          <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100 hidden sm:inline-flex">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">Analitik & Statistik</h1>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mt-0.5">Monitoring Performa {unitName}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* KPI Section */}
        <section className="grid gap-4 sm:grid-cols-3 mb-8">
          {kpis.map((kpi, i) => (
            <Card key={i} className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl ${kpi.bg} flex items-center justify-center ${kpi.color}`}>
                  <kpi.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-2xl font-bold text-slate-100">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Trend Chart */}
          <Card className="border-slate-800 bg-slate-900/40 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                Tren Insiden (7 Hari Terakhir)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
                    itemStyle={{ color: "#10b981" }}
                  />
                  <Line type="monotone" dataKey="jumlah" stroke="#10b981" strokeWidth={3} dot={{ fill: "#10b981", r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Composition Chart */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-amber-400" />
                Komposisi Hasil Perbaikan
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resultData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {resultData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Responsibility Chart */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Tanggung Jawab Pekerjaan
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={handlerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {handlerData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        {/* Vendor Performance Leaderboard */}
        <Card className="border-slate-800 bg-slate-900/40 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              Performa Tim (Success Rate %)
            </CardTitle>
            <CardDescription>Persentase keberhasilan perbaikan berdasarkan penanggung jawab.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaderboardData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} hide />
                <YAxis dataKey="name" type="category" stroke="#f1f5f9" fontSize={12} width={80} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
                />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={30}>
                  {leaderboardData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  );
}
