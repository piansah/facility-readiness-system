import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  ShieldCheck, 
  ClipboardCheck, 
  AlertCircle, 
  BarChart3, 
  Users, 
  Building2, 
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GuidePage() {
  return (
    <main className="min-h-dvh bg-slate-950 pb-20">
      <Suspense fallback={<div className="p-12 text-center text-slate-500 animate-pulse uppercase text-[10px] font-bold tracking-widest">Menyiapkan Panduan...</div>}>
        <GuideContent />
      </Suspense>
    </main>
  );
}

async function GuideContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { profile } = await getProfile(supabase, user.id);
  const role = profile?.role || "petugas";

  return (
    <>
      {/* Header Premium */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex w-full max-w-[1400px] items-center gap-4 px-4 md:px-8 py-4">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-slate-400 p-0 w-9 h-9">
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 text-emerald-500 mb-0.5">
              <BookOpen className="h-3 w-3" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Panduan Sistem</span>
            </div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">
              Panduan {role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin Unit' : 'Petugas Lapangan'}
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-8 py-8">
        <section className="mb-10 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 mb-4 border border-emerald-500/20">
            <Zap className="h-5 w-5" />
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Instruksi penggunaan fitur khusus untuk wewenang Anda sebagai <span className="text-emerald-400 font-bold italic">{role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin Unit' : 'Petugas Lapangan'}</span>.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {role === 'petugas' && (
            <>
              <GuideCard 
                icon={<ClipboardCheck className="h-6 w-6 text-emerald-400" />}
                title="Laporan Harian"
                description="Melakukan pengecekan rutin fasilitas setiap shift."
                steps={[
                  "Buka Dashboard dan pilih shift aktif Anda.",
                  "Ceklis status setiap fasilitas (Normal/Rusak/Menurun).",
                  "Tambahkan catatan jika diperlukan.",
                  "Klik 'Simpan Laporan' untuk submit."
                ]}
              />
              <GuideCard 
                icon={<AlertCircle className="h-6 w-6 text-amber-400" />}
                title="Laporan Kegiatan"
                description="Melaporkan preventive terjadwal atau kegiatan di luar jadwal."
                steps={[
                  "Klik tombol '+' atau 'Buat Laporan Kegiatan' di Dashboard.",
                  "Pilih jenis kegiatan: terjadwal/preventive atau tidak terjadwal/non-rutin.",
                  "Isi judul, deskripsi, dan upload foto dokumentasi.",
                  "Pilih fasilitas terkait jika ada."
                ]}
              />
              <GuideCard 
                icon={<Calendar className="h-6 w-6 text-blue-400" />}
                title="Jadwal Dinas"
                description="Melihat pembagian shift kerja personil."
                steps={[
                  "Buka Menu Jadwal Dinas di Dashboard.",
                  "Gunakan filter bulan untuk melihat jadwal mendatang.",
                  "Pastikan Anda melakukan submit laporan sesuai shift yang tertera."
                ]}
              />
            </>
          )}

          {role === 'admin' && (
            <>
              <GuideCard 
                icon={<CheckCircle2 className="h-6 w-6 text-blue-400" />}
                title="Review Laporan"
                description="Memverifikasi laporan harian yang disubmit petugas."
                steps={[
                  "Masuk ke menu 'Review Laporan' dari Dashboard.",
                  "Periksa detail status fasilitas yang dilaporkan.",
                  "Berikan persetujuan (approve) agar laporan menjadi permanen."
                ]}
              />
              <GuideCard 
                icon={<BarChart3 className="h-6 w-6 text-emerald-400" />}
                title="Statistik & Analitik"
                description="Monitoring performa perbaikan dan tren insiden."
                steps={[
                  "Buka menu Statistik untuk melihat grafik success rate.",
                  "Gunakan data untuk evaluasi kinerja vendor atau tim internal.",
                  "Pantau tren insiden selama 7 hari terakhir."
                ]}
              />
              <GuideCard 
                icon={<Users className="h-6 w-6 text-purple-400" />}
                title="Manajemen Pengguna"
                description="Mengelola akun petugas di unit Anda."
                steps={[
                  "Tambah atau nonaktifkan akun petugas.",
                  "Reset password petugas jika diperlukan.",
                  "Pastikan setiap petugas memiliki akses yang sesuai."
                ]}
              />
            </>
          )}

          {role === 'super_admin' && (
            <>
              <GuideCard 
                icon={<Building2 className="h-6 w-6 text-purple-400" />}
                title="Management Unit"
                description="Menambah dan mengatur unit kerja di seluruh sistem."
                steps={[
                  "Buat unit baru (Contoh: PLN, Gedung Utama).",
                  "Kelola kategori fasilitas unik per unit.",
                  "Monitor aktivitas global di seluruh unit."
                ]}
              />
              <GuideCard 
                icon={<ShieldCheck className="h-6 w-6 text-red-400" />}
                title="Kontrol Akses Global"
                description="Mengatur otorisasi dan keamanan sistem."
                steps={[
                  "Memantau seluruh log aktivitas (audit trail).",
                  "Mengatur konfigurasi sistem inti.",
                  "Backup data dan pemeliharaan database."
                ]}
              />
            </>
          )}
        </div>

        {/* Footer Help */}
        <section className="mt-12 border-t border-slate-900 pt-8 text-center">
          <p className="text-slate-500 text-xs px-6">
            Butuh bantuan lebih lanjut? Hubungi Tim IT Support melalui grup koordinasi.
          </p>
        </section>
      </div>
    </>
  );
}

function GuideCard({ icon, title, description, steps }: { icon: React.ReactNode, title: string, description: string, steps: string[] }) {
  return (
    <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm shadow-xl flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="mb-2">{icon}</div>
        <CardTitle className="text-base text-slate-100">{title}</CardTitle>
        <CardDescription className="text-xs text-slate-500 leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[10px] font-black text-emerald-500 border border-slate-700">
                {i + 1}
              </div>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
