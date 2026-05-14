import Link from "next/link";
import { 
  BookOpen, 
  UserCircle, 
  ShieldCheck, 
  Hammer, 
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GuidePage() {
  return (
    <main className="min-h-dvh bg-slate-950 pb-20">
      {/* Header Premium */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-slate-400 hover:bg-slate-800">
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 text-emerald-500 mb-0.5">
              <BookOpen className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Documentation</span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Panduan Penggunaan Sistem</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Intro Section */}
        <section className="mb-12 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
            <Zap className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-bold text-slate-100 mb-4">Selamat Datang di Preventif</h2>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Sistem Pemeliharaan Preventif Terintegrasi dirancang untuk mempermudah monitoring fasilitas dan pelaporan insiden secara real-time. Pilih peran Anda di bawah untuk mempelajari cara menggunakan fitur-fitur yang tersedia.
          </p>
        </section>

        <Tabs defaultValue="petugas" className="space-y-8">
          <div className="flex justify-center">
            <TabsList className="bg-slate-900 border border-slate-800 p-1 h-12">
              <TabsTrigger value="petugas" className="px-6 data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all">
                <Hammer className="h-4 w-4 mr-2" />
                Petugas
              </TabsTrigger>
              <TabsTrigger value="admin" className="px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                <ShieldCheck className="h-4 w-4 mr-2" />
                Admin Unit
              </TabsTrigger>
              <TabsTrigger value="super" className="px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all">
                <UserCircle className="h-4 w-4 mr-2" />
                Super Admin
              </TabsTrigger>
            </TabsList>
          </div>

          {/* PETUGAS GUIDE */}
          <TabsContent value="petugas" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              title="Laporan Non-Rutin"
              description="Melaporkan kejadian mendadak atau perbaikan di luar jadwal."
              steps={[
                "Klik tombol '+' atau 'Buat Laporan Insiden' di Dashboard.",
                "Isi judul, deskripsi, dan upload foto dokumentasi.",
                "Pilih fasilitas terkait jika ada.",
                "Laporan ini akan muncul di timeline tindak lanjut."
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
          </TabsContent>

          {/* ADMIN GUIDE */}
          <TabsContent value="admin" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
          </TabsContent>

          {/* SUPER ADMIN GUIDE */}
          <TabsContent value="super" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <GuideCard 
              icon={<Building2 className="h-6 w-6 text-purple-400" />}
              title="Manajemen Unit"
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
          </TabsContent>
        </Tabs>

        {/* Footer Help */}
        <section className="mt-16 border-t border-slate-800 pt-8 text-center">
          <p className="text-slate-400 text-sm">
            Butuh bantuan lebih lanjut? Hubungi Tim IT Support melalui grup koordinasi atau Admin Sistem.
          </p>
          <div className="mt-6">
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
              <Link href="/dashboard">Kembali ke Dashboard</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}

function GuideCard({ icon, title, description, steps }: { icon: React.ReactNode, title: string, description: string, steps: string[] }) {
  return (
    <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm hover:border-slate-700 transition-all group">
      <CardHeader>
        <div className="mb-4">{icon}</div>
        <CardTitle className="text-lg text-slate-100 group-hover:text-emerald-400 transition-colors">{title}</CardTitle>
        <CardDescription className="text-slate-400">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-400">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
