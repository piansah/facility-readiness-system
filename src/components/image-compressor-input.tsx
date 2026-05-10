"use client";

import { useState, useRef } from "react";
import { Camera, ImagePlus } from "lucide-react";
import imageCompression from "browser-image-compression";
import { Button } from "@/components/ui/button";

export function ImageCompressorInput({ name }: { name: string; required?: boolean }) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    
    try {
      const dataTransfer = new DataTransfer();
      
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
      
      // Update the input's files with the compressed ones
      event.target.files = dataTransfer.files;
      setFileCount(countSelectedFiles());
    } catch (error) {
      console.error("Compression error:", error);
      alert("Gagal mengompresi foto. Pastikan format gambar didukung.");
    } finally {
      setIsCompressing(false);
    }
  };

  const countSelectedFiles = () => {
    const cameraFiles = cameraInputRef.current?.files?.length ?? 0;
    const galleryFiles = galleryInputRef.current?.files?.length ?? 0;
    return cameraFiles + galleryFiles;
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
      <input
        ref={cameraInputRef}
        id={`${name}-camera`}
        name={name}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="sr-only"
      />
      <input
        ref={galleryInputRef}
        id={`${name}-gallery`}
        name={name}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="sr-only"
      />
      <p className="text-xs text-slate-400">
        {fileCount > 0 ? `${fileCount} foto siap diunggah.` : "Belum ada foto dipilih."}
      </p>
      {isCompressing && (
        <p className="text-xs font-medium text-amber-500 animate-pulse">
          Mengompresi ukuran foto untuk menghemat kuota...
        </p>
      )}
    </div>
  );
}
