import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth/profile";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="p-10 text-red-500 bg-slate-950 min-h-screen">Silakan login dulu.</div>;
  }

  const { profile } = await getProfile(supabase, user.id);
  const admin = createAdminClient();
  
  const { data: report, error: reportError } = await admin
    .from("daily_reports")
    .select("id, unit_id, status")
    .eq("id", id)
    .single();

  if (reportError) {
    return <div className="p-10 text-red-500 bg-slate-950 min-h-screen font-mono">
      DB Error: {reportError.message}
      <br />
      Code: {reportError.code}
    </div>;
  }

  if (!report) {
    return <div className="p-10 text-red-500 bg-slate-950 min-h-screen">
      Record not found for ID: {id}
    </div>;
  }

  return (
    <div className="p-10 text-emerald-500 bg-slate-950 min-h-screen font-mono whitespace-pre">
      <h1>Record Found!</h1>
      ID: {report.id}
      Unit ID: {report.unit_id}
      Status: {report.status}
      User Unit ID: {profile?.unit_id}
      
      <hr className="my-5 opacity-20" />
      <p className="text-slate-400">Jika teks ini muncul, berarti datanya ada. Masalahnya di query yang terlalu kompleks sebelumnya.</p>
    </div>
  );
}
