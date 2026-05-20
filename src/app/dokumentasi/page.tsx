"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Search, BookOpen, ImageIcon, AlertTriangle, FileText, Download, X, Plus, Upload, Loader2, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { getUploadFormData, getKnowledgeBaseDocs } from "./actions";

export default function DokumentasiPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPdf, setSelectedPdf] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormType, setAddFormType] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ value: string, label: string, icon: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [userProfile, setUserProfile] = useState<{ id: string, unit_id: string | null, role: string } | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const supabase = createClient();

  const fetchDocs = async () => {
    const result = await getKnowledgeBaseDocs();
    if (result && !result.error && result.docs) {
      setDocs(result.docs);
    }
  };

  useEffect(() => {
    async function fetchData() {
      const result = await getUploadFormData();
      if (result && !result.error && result.profile) {
        setUserProfile(result.profile);
        if (result.categories) {
          setCategories(result.categories.map((c: any) => ({ value: c.id, label: c.name, icon: c.icon })));
        }
      }
      await fetchDocs();
    }
    fetchData();
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!addFormType) return;
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const title = formData.get("title") as string;
      const rawCategoryId = formData.get("category_id") as string;
      const facility_category_id = rawCategoryId === "none" ? null : rawCategoryId;
      const description = formData.get("description") as string;
      const error_code = formData.get("error_code") as string;
      const content = formData.get("content") as string;

      if (!userProfile) throw new Error("Profile not loaded");
      if (!userProfile.unit_id) throw new Error("Unit ID not found in profile");
      if (userProfile.role !== 'admin' && userProfile.role !== 'super_admin') {
        throw new Error("Anda tidak memiliki izin untuk mengunggah dokumen.");
      }

      let file_path = null;
      let file_size_bytes = null;

      if (addFormType !== 'triage' && file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${userProfile.unit_id}/${addFormType}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('knowledge_base')
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        file_path = filePath;
        file_size_bytes = file.size;
      }

      const { error: insertError } = await supabase
        .from('knowledge_base')
        .insert({
          unit_id: userProfile.unit_id,
          facility_category_id: facility_category_id || null,
          category: addFormType,
          title,
          description: description || null,
          file_path,
          file_size_bytes,
          error_code: addFormType === 'triage' ? error_code : null,
          content: addFormType === 'triage' ? content : null,
          created_by: userProfile.id
        });

      if (insertError) throw insertError;

      toast.success("Dokumen berhasil ditambahkan!");
      setAddFormType(null);
      setIsAddModalOpen(false);
      setFile(null);
      fetchDocs();

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Gagal menyimpan dokumen");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (selectedPdf) {
        setSelectedPdf(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedPdf]);

  const openPdf = (doc: any) => {
    window.history.pushState({ pdfOpen: true }, "");
    setSelectedPdf(doc);
  };

  const closePdf = () => {
    router.back();
  };

  // Filtered Data from DB
  const filteredDocs = docs.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (doc.error_code && doc.error_code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const manuals = filteredDocs.filter(d => d.category === 'manual');
  const sops = filteredDocs.filter(d => d.category === 'sop');
  const troubleshoots = filteredDocs.filter(d => d.category === 'triage');
  const visualStandards = filteredDocs.filter(d => d.category === 'visual');

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-32">
      {/* Header Premium (Consistent with Panduan) */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 md:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-slate-400 p-0 w-9 h-9">
              <Link href="/dashboard">
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2 text-emerald-500 mb-0.5">
                <BookOpen className="h-3 w-3" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Pusat Pengetahuan</span>
              </div>
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">
                Dokumentasi & SOP
              </h1>
            </div>
          </div>
          {userProfile && (userProfile.role === 'admin' || userProfile.role === 'super_admin') && (
            <Button 
              onClick={() => setIsAddModalOpen(true)} 
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span>Tambah</span>
            </Button>
          )}
        </div>
      </header>

      <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <Input
            type="text"
            placeholder="Cari dokumen, SOP, atau kode error..."
            className="pl-10 bg-slate-900 border-slate-800 text-slate-200 h-12 rounded-xl focus-visible:ring-emerald-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="w-full bg-slate-900 border border-slate-800 h-14 p-1 rounded-xl mb-6 grid grid-cols-4">
            <TabsTrigger value="manual" className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500 text-slate-400 rounded-lg flex flex-col items-center justify-center gap-1 transition-all">
              <BookOpen className="h-4 w-4" />
              <span className="text-[9px] font-medium uppercase">Manual</span>
            </TabsTrigger>
            <TabsTrigger value="sop" className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500 text-slate-400 rounded-lg flex flex-col items-center justify-center gap-1 transition-all">
              <FileText className="h-4 w-4" />
              <span className="text-[9px] font-medium uppercase">SOP</span>
            </TabsTrigger>
            <TabsTrigger value="troubleshoot" className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500 text-slate-400 rounded-lg flex flex-col items-center justify-center gap-1 transition-all">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-[9px] font-medium uppercase">Triage</span>
            </TabsTrigger>
            <TabsTrigger value="visual" className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500 text-slate-400 rounded-lg flex flex-col items-center justify-center gap-1 transition-all">
              <ImageIcon className="h-4 w-4" />
              <span className="text-[9px] font-medium uppercase">Visual</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Manual */}
          <TabsContent value="manual" className="space-y-4 outline-none">
            {manuals.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-slate-800 rounded-xl">
                <BookOpen className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Belum ada Manual yang ditambahkan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {manuals.map((doc) => (
                  <Card
                    key={doc.id}
                    className="bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-all cursor-pointer active:scale-[0.98]"
                    onClick={() => openPdf(doc)}
                  >
                    <CardContent className="p-4 flex items-center gap-4 h-full">
                      <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl shrink-0">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-200 mb-1 leading-tight line-clamp-2">{doc.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 truncate max-w-[120px]">{doc.facility_categories?.name || "Umum"}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.file_size_bytes)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: SOP */}
          <TabsContent value="sop" className="space-y-4 outline-none">
            {sops.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-slate-800 rounded-xl">
                <FileText className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Belum ada SOP yang ditambahkan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sops.map((doc) => (
                  <Card
                    key={doc.id}
                    className="bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-all cursor-pointer active:scale-[0.98]"
                    onClick={() => openPdf(doc)}
                  >
                    <CardContent className="p-4 flex items-center gap-4 h-full">
                      <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-200 mb-1 leading-tight line-clamp-2">{doc.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 truncate max-w-[120px]">{doc.facility_categories?.name || "Umum"}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.file_size_bytes)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Troubleshoot */}
          <TabsContent value="troubleshoot" className="space-y-4 outline-none">
            {troubleshoots.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-slate-800 rounded-xl">
                <AlertTriangle className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Belum ada panduan Triage yang ditambahkan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {troubleshoots.map((ts) => (
                  <Card key={ts.id} className="bg-slate-900 border-slate-800 overflow-hidden flex flex-col h-full shadow-lg">
                    <div className="p-3.5 bg-red-500/10 border-b border-slate-800/50 flex items-center gap-3">
                      <div className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold font-mono shrink-0">
                        {ts.error_code || "UMUM"}
                      </div>
                      <h3 className="text-sm font-bold text-slate-200 truncate">{ts.title}</h3>
                    </div>
                    <CardContent className="p-4 bg-slate-900/50 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <p className="text-xs text-slate-400">Aset: <span className="text-slate-200 font-bold bg-slate-800 px-2 py-0.5 rounded">{ts.facility_categories?.name || "Umum"}</span></p>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Langkah Penanganan:</p>
                          <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                            {ts.content || "Belum ada detail langkah penanganan."}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Visual */}
          <TabsContent value="visual" className="space-y-4 outline-none">
            {visualStandards.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-slate-800 rounded-xl">
                <ImageIcon className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Belum ada Standar Visual yang ditambahkan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visualStandards.map((vis) => {
                  const imgUrl = vis.file_path ? supabase.storage.from('knowledge_base').getPublicUrl(vis.file_path).data.publicUrl : '';
                  return (
                    <Card key={vis.id} className="bg-slate-900 border-slate-800 overflow-hidden flex flex-col h-full shadow-lg">
                      <div className="aspect-video w-full bg-slate-850 relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {imgUrl ? (
                          <img src={imgUrl} alt={vis.title} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500"><ImageIcon className="w-10 h-10" /></div>
                        )}
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded font-medium">
                          {vis.facility_categories?.name || "Umum"}
                        </div>
                      </div>
                      <CardContent className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-200 mb-1 leading-snug">{vis.title}</h3>
                          <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{vis.description || "Tidak ada deskripsi."}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* PDF Viewer Modal */}
      {selectedPdf && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in slide-in-from-bottom-full duration-200">
          <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={closePdf} className="text-slate-400 hover:text-white">
                <X className="h-6 w-6" />
              </Button>
              <h2 className="text-sm font-bold text-slate-200 truncate max-w-[200px]">{selectedPdf.title}</h2>
            </div>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" asChild>
              <a href={selectedPdf.file_path ? supabase.storage.from('knowledge_base').getPublicUrl(selectedPdf.file_path).data.publicUrl : "#"} target="_blank" rel="noopener noreferrer">
                <Download className="h-5 w-5" />
              </a>
            </Button>
          </div>
          <div className="flex-1 bg-slate-800 flex items-center justify-center relative">
            {selectedPdf.file_path ? (
              <iframe 
                src={`https://docs.google.com/gview?url=${encodeURIComponent(supabase.storage.from('knowledge_base').getPublicUrl(selectedPdf.file_path).data.publicUrl)}&embedded=true`}
                className="w-full h-full border-0"
                title={selectedPdf.title}
              />
            ) : (
              <div className="text-center space-y-4 p-8">
                <FileText className="h-16 w-16 text-slate-600 mx-auto" />
                <div>
                  <p className="text-slate-300 font-medium">File Tidak Ditemukan</p>
                  <p className="text-slate-500 text-sm mt-1">Dokumen ini tidak memiliki file lampiran.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-[400px] bg-slate-900/95 border-slate-800 p-0 overflow-hidden shadow-2xl">
          <div className="flex items-center gap-3 p-4 border-b border-slate-800">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <Plus className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-100">Pilih Jenis Dokumentasi</DialogTitle>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <button onClick={() => { setAddFormType('manual'); setIsAddModalOpen(false); }} className="flex flex-col items-center justify-center gap-4 p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <BookOpen className="w-7 h-7 text-emerald-500" />
              </div>
              <span className="text-xs font-bold text-slate-300">Manual Book</span>
            </button>
            <button onClick={() => { setAddFormType('sop'); setIsAddModalOpen(false); }} className="flex flex-col items-center justify-center gap-4 p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <FileText className="w-7 h-7 text-emerald-500" />
              </div>
              <span className="text-xs font-bold text-slate-300">SOP</span>
            </button>
            <button onClick={() => { setAddFormType('triage'); setIsAddModalOpen(false); }} className="flex flex-col items-center justify-center gap-4 p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <AlertTriangle className="w-7 h-7 text-emerald-500" />
              </div>
              <span className="text-xs font-bold text-slate-300">Triage / Error</span>
            </button>
            <button onClick={() => { setAddFormType('visual'); setIsAddModalOpen(false); }} className="flex flex-col items-center justify-center gap-4 p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <ImageIcon className="w-7 h-7 text-emerald-500" />
              </div>
              <span className="text-xs font-bold text-slate-300">Standar Visual</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Form Upload Modal */}
      <Dialog open={!!addFormType} onOpenChange={(open) => !open && setAddFormType(null)}>
        <DialogContent className="max-w-[400px] bg-slate-950 border-slate-800 p-0 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
          <div className="flex items-center gap-3 p-4 border-b border-slate-800 shrink-0">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              {addFormType === 'manual' ? <BookOpen className="h-5 w-5" /> :
                addFormType === 'sop' ? <FileText className="h-5 w-5" /> :
                  addFormType === 'triage' ? <AlertTriangle className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-100">
                {addFormType === 'manual' ? 'Tambah Manual Book' :
                  addFormType === 'sop' ? 'Tambah SOP' :
                    addFormType === 'triage' ? 'Tambah Triage / Error' : 'Tambah Standar Visual'}
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-1">Formulir Upload Dokumen</p>
            </div>
          </div>

          <div className="overflow-y-auto p-4">
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="category_id" className="text-xs text-slate-300 font-bold">Kategori Aset (Opsional)</Label>
                <select
                  id="category_id"
                  name="category_id"
                  className="w-full h-11 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
                  defaultValue="none"
                >
                  <option value="none">General / Tidak Spesifik</option>
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.icon ? `${category.icon} ` : ""}{category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-bold">Judul Dokumen <span className="text-red-500">*</span></Label>
                <Input name="title" required placeholder="Cth: Manual Genset Cummins..." className="bg-slate-900 border-slate-800 text-sm h-10" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300 font-bold">Deskripsi Singkat</Label>
                <textarea name="description" placeholder="Catatan tambahan..." className="flex min-h-[60px] w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500" />
              </div>

              {addFormType === 'triage' ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300 font-bold">Kode Error <span className="text-red-500">*</span></Label>
                    <Input name="error_code" required placeholder="Cth: E04, ALARM-01" className="bg-slate-900 border-slate-800 font-mono text-red-400 uppercase text-sm h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300 font-bold">Langkah Penanganan <span className="text-red-500">*</span></Label>
                    <textarea name="content" required placeholder="1. Matikan mesin&#10;2. Cek filter..." className="flex min-h-[120px] w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500" />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-bold">Upload File <span className="text-red-500">*</span></Label>
                  <div className="border-2 border-dashed border-slate-800 rounded-xl p-5 text-center hover:bg-slate-800/50 transition-colors relative bg-slate-900/50">
                    <input
                      type="file"
                      required
                      accept={addFormType === 'visual' ? "image/*,video/mp4" : "application/pdf"}
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="pointer-events-none flex flex-col items-center gap-2 text-slate-400">
                      <Upload className="h-6 w-6 text-slate-500" />
                      {file ? (
                        <span className="text-emerald-500 font-bold text-xs truncate max-w-full px-2">{file.name}</span>
                      ) : (
                        <div className="text-xs">
                          <span className="text-emerald-500 font-bold">Pilih file</span> atau tarik
                          <p className="text-[9px] mt-1 text-slate-500 uppercase font-bold">
                            {addFormType === 'visual' ? 'JPG, PNG, MP4 (Max 10MB)' : 'PDF (Max 10MB)'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Button type="submit" disabled={isLoading} className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20 mt-4">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Simpan Dokumen</>}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
