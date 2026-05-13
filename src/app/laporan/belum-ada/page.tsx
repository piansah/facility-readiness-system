import Link from "next/link";
import { ArrowLeft, Clock3, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LaporanBelumAdaPage() {
  return (
    <main className="min-h-dvh bg-slate-950 flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full border-slate-800 bg-slate-900/40 backdrop-blur-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <Clock3 className="h-8 w-8" />
          </div>
          <CardTitle className="text-xl text-slate-100">Laporan Belum Dibuat</CardTitle>
          <CardDescription>
            Petugas belum memulai pengisian laporan untuk shift ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3 items-start">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-200/80 leading-relaxed">
              Sebagai Admin, Anda dapat meninjau laporan segera setelah Petugas melakukan submit. Silakan periksa kembali beberapa saat lagi.
            </p>
          </div>
          
          <Button asChild className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
