"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ImageCompressorInput({ name }: { name: string; required?: boolean }) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [previews, setPreviews] = useState<{ name: string; url: string }[]>([]);
  const submitInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    
    try {
      const dataTransfer = new DataTransfer();

      for (const existingFile of Array.from(submitInputRef.current?.files ?? [])) {
        dataTransfer.items.add(existingFile);
      }
      
      const options = {
        maxSizeMB: 0.5, // Compress to max 500KB
        maxWidthOrHeight: 1280,
        useWebWorker: true
      };

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Only compress if the file is larger than 500KB and is an image
        if (file.size > 500 * 1024 && file.type.startsWith("image/")) {
          const compressedBlob = await imageCompression(file, options);
          const compressedFile = new File([compressedBlob], file.name, { type: compressedBlob.type });
          dataTransfer.items.add(compressedFile);
        } else {
          dataTransfer.items.add(file);
        }
      }
      
      if (submitInputRef.current) {
        submitInputRef.current.files = dataTransfer.files;
      }

      event.target.value = "";
      updatePreviews();
    } catch (error) {
      console.error("Compression error:", error);
      toast.error("Gagal mengompresi foto. Pastikan format gambar didukung.");
    } finally {
      setIsCompressing(false);
    }
  };

  const updatePreviews = () => {
    setPreviews((current) => {
      current.forEach((preview) => URL.revokeObjectURL(preview.url));

      const files = Array.from(submitInputRef.current?.files ?? []);

      return files.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      }));
    });
  };

  const removePhoto = (indexToRemove: number) => {
    const dataTransfer = new DataTransfer();

    Array.from(submitInputRef.current?.files ?? []).forEach((file, index) => {
      if (index !== indexToRemove) {
        dataTransfer.items.add(file);
      }
    });

    if (submitInputRef.current) {
      submitInputRef.current.files = dataTransfer.files;
    }

    updatePreviews();
  };

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={() => cameraInputRef.current?.click()}>
          <Camera className="h-4 w-4" aria-hidden="true" />
          Ambil Foto
        </Button>
        <Button type="button" variant="outline" onClick={() => galleryInputRef.current?.click()}>
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          Galeri
        </Button>
      </div>
      <input ref={submitInputRef} name={name} type="file" multiple className="sr-only" />
      <input
        ref={cameraInputRef}
        id={`${name}-camera`}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="sr-only"
      />
      <input
        ref={galleryInputRef}
        id={`${name}-gallery`}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="sr-only"
      />
      {previews.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {previews.map((preview, index) => (
            <figure key={preview.url} className="relative overflow-hidden rounded-md border border-slate-800 bg-slate-950">
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute right-1 top-1 rounded-full bg-slate-950/80 p-1 text-slate-200 shadow hover:bg-red-950 hover:text-red-200"
                aria-label={`Hapus ${preview.name}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.url} alt={preview.name} className="h-28 w-full object-cover" />
              <figcaption className="truncate px-2 py-1 text-[11px] text-slate-400">{preview.name}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">Belum ada foto dipilih.</p>
      )}
      {isCompressing && (
        <p className="text-xs font-medium text-amber-500 animate-pulse">
          Mengompresi ukuran foto untuk menghemat kuota...
        </p>
      )}
    </div>
  );
}
