import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
import { getProfile } from "@/lib/auth/profile";
import { getVendorsData, getActiveUnits } from "./actions";
import { redirect } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Shield, Building, Users, Calendar, Phone, Mail, FileText, CheckCircle2, ShieldAlert, Banknote, Download, Wrench, ChevronRight } from "lucide-react";
import { VendorFormModal, ContractFormModal } from "./VendorForm";
import { ServiceLogFormModal } from "./ServiceLogForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function VendorManagementPage() {
  const supabase = await createClient();
  const { user } = await (await supabase.auth.getUser()).data;
  
  if (!user) redirect("/login");

  const { profile } = await getProfile(supabase, user.id);
  if (!profile || (profile.role !== "super_admin" && profile.role !== "admin")) {
    redirect("/dashboard");
  }

  const { vendors, error } = await getVendorsData();
  const units = profile.role === "super_admin" ? await getActiveUnits() : [];

  // Calculate statistics
  const totalVendors = vendors?.length || 0;
  
  // Total Active Contracts
  const todayStr = new Date().toISOString().split('T')[0];
  const activeContractsCount = (vendors ?? []).reduce((acc, v) => {
    const activeInVendor = (v.contracts ?? []).filter((c: any) => !c.end_date || c.end_date >= todayStr).length;
    return acc + activeInVendor;
  }, 0);

  // Total Repair Cost
  // We will fetch service logs to sum costs
  let totalRepairCost = 0;
  const { data: allLogs } = await supabase.from("vendor_service_logs").select("cost");
  if (allLogs) {
    totalRepairCost = allLogs.reduce((acc, log) => acc + (Number(log.cost) || 0), 0);
  }

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-500 mb-1">
              <Shield className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Management Vendor</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">
              Direktori Vendor & Kontrak Kerja (SLA)
            </h1>
            <p className="text-sm text-slate-400">
              Kelola pihak ketiga, log pemeliharaan luar, garansi aset, dan performa SLA respon.
            </p>
          </div>
          <div>
            <VendorFormModal 
              units={units} 
              currentUserRole={profile.role} 
              onSuccess={async () => {
                "use server";
                // Page will naturally reload on Server Action revalidation
              }} 
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-[10px] uppercase tracking-wider text-slate-500">Total Vendor Terdaftar</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl font-black text-slate-100">
                <Users className="h-5 w-5 text-emerald-400 shrink-0" />
                {totalVendors} Perusahaan
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-[10px] uppercase tracking-wider text-slate-500">Kontrak & SLA Aktif</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl font-black text-slate-100">
                <FileText className="h-5 w-5 text-blue-400 shrink-0" />
                {activeContractsCount} Kontrak Kerja
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-[10px] uppercase tracking-wider text-slate-500">Total Pengeluaran Perbaikan</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl font-black text-emerald-400">
                <Banknote className="h-5 w-5 text-emerald-400 shrink-0" />
                Rp {totalRepairCost.toLocaleString("id-ID")}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Vendor List */}
        <div className="space-y-6">
          {error ? (
            <div className="text-center p-8 border border-red-900/50 rounded-xl bg-red-950/10">
              <p className="text-red-400 font-bold">Gagal memuat data vendor</p>
              <p className="text-xs text-slate-500 mt-1">{error}</p>
            </div>
          ) : !vendors || vendors.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-800 rounded-3xl bg-slate-900/10">
              <Users className="h-12 w-12 text-slate-700 mx-auto mb-4" />
              <h3 className="text-slate-300 font-bold text-lg">Belum Ada Vendor</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Silakan tambahkan data pihak ketiga / vendor perawatan bandara untuk memulai pencatatan kontrak kerja & SLA.
              </p>
            </div>
          ) : (
            vendors.map(async (v) => {
              // Fetch service logs for this vendor
              const { data: logs } = await supabase
                .from("vendor_service_logs")
                .select(`
                  *,
                  incidents (
                    title,
                    status
                  )
                `)
                .eq("vendor_id", v.id)
                .order("called_at", { ascending: false });

              return (
                <div 
                  key={v.id} 
                  className="rounded-3xl border border-slate-800 bg-slate-900/30 overflow-hidden shadow-2xl transition-all hover:border-slate-700 backdrop-blur-md"
                >
                  {/* Vendor Details Row */}
                  <div className="p-6 bg-slate-900/40 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center font-black text-emerald-400 text-base border border-emerald-500/10 shadow-lg">
                          {v.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-slate-100 leading-tight">{v.name}</h2>
                          {profile.role === "super_admin" && (
                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-0.5">
                              {v.units?.code} - {v.units?.name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        {v.pic_name && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-slate-500" />
                            <span>PIC: <strong className="text-slate-300">{v.pic_name}</strong></span>
                          </div>
                        )}
                        {v.pic_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-slate-500" />
                            <a href={`tel:${v.pic_phone}`} className="hover:text-emerald-400 transition-colors">{v.pic_phone}</a>
                          </div>
                        )}
                        {v.emergency_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-red-500" />
                            <span className="text-red-400">Emerg: <strong>{v.emergency_phone}</strong></span>
                          </div>
                        )}
                        {v.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-slate-500" />
                            <a href={`mailto:${v.email}`} className="hover:text-emerald-400 transition-colors">{v.email}</a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <ContractFormModal 
                        vendorId={v.id} 
                        onSuccess={async () => {
                          "use server";
                        }} 
                      />
                      <ServiceLogFormModal 
                        vendorId={v.id} 
                        vendorName={v.name} 
                        onSuccess={async () => {
                          "use server";
                        }} 
                      />
                      <VendorFormModal 
                        vendor={v} 
                        units={units} 
                        currentUserRole={profile.role} 
                        onSuccess={async () => {
                          "use server";
                        }} 
                      />
                      <form action={async () => {
                        "use server";
                        const client = await createClient();
                        await client.from("vendors").delete().eq("id", v.id);
                      }}>
                        <Button 
                          type="submit" 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs font-bold text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                          Hapus
                        </Button>
                      </form>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-950/20">
                    {/* Contracts Section */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        Kontrak Kerja & SLA
                      </h3>
                      {!v.contracts || v.contracts.length === 0 ? (
                        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/10 text-center text-xs text-slate-500">
                          Belum ada kontrak kerja yang didaftarkan untuk vendor ini.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {v.contracts.map((c: any) => {
                            const isExpired = c.end_date && c.end_date < todayStr;
                            return (
                              <div 
                                key={c.id} 
                                className="p-4 rounded-2xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-all flex items-start justify-between gap-4"
                              >
                                <div className="space-y-1 min-w-0">
                                  <h4 className="text-sm font-bold text-slate-200 truncate">{c.title}</h4>
                                  <p className="text-[10px] font-mono text-slate-500">{c.contract_number || "Tanpa No. Kontrak"}</p>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 mt-2">
                                    {c.start_date && c.end_date && (
                                      <span>Masa: {new Date(c.start_date).toLocaleDateString("id-ID")} - {new Date(c.end_date).toLocaleDateString("id-ID")}</span>
                                    )}
                                    {c.sla_response_hours && (
                                      <span className="text-blue-400 font-medium">SLA: {c.sla_response_hours} Jam</span>
                                    )}
                                    {c.warranty_period_months && (
                                      <span className="text-emerald-400 font-medium">Garansi: {c.warranty_period_months} Bln</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 shrink-0">
                                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                    isExpired ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  }`}>
                                    {isExpired ? "Kedaluwarsa" : "Aktif"}
                                  </span>

                                  {c.document_path && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-emerald-400" asChild>
                                      <a href={supabase.storage.from('contracts').getPublicUrl(c.document_path).data.publicUrl} target="_blank" rel="noopener noreferrer">
                                        <Download className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Exterior Service Logs Section */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-slate-400" />
                        Log Servis Eksternal
                      </h3>
                      {!logs || logs.length === 0 ? (
                        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/10 text-center text-xs text-slate-500">
                          Belum ada log servis eksternal tercatat untuk vendor ini.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {logs.map((log: any) => (
                            <div 
                              key={log.id} 
                              className="p-4 rounded-2xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-all space-y-2"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Perbaikan Gangguan</h4>
                                  <p className="text-sm font-bold text-slate-200 mt-0.5">{log.incidents?.title || "Umum"}</p>
                                </div>
                                <span className="text-xs font-black text-emerald-400 shrink-0">
                                  Rp {Number(log.cost).toLocaleString("id-ID")}
                                </span>
                              </div>

                              <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/50 p-2.5 rounded-xl border border-slate-850">
                                {log.service_details}
                              </p>

                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                                <span>Panggilan: {new Date(log.called_at).toLocaleString("id-ID")}</span>
                                {log.completed_at && (
                                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Selesai
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
