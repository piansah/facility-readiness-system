"use client";

import { useState, useRef } from "react";
import imageCompression from "browser-image-compression";
import { Input } from "@/components/ui/input";

export function ImageCompressorInput({ name, required }: { name: string; required?: boolean }) {
  const [isCompressing, setIsCompressing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      if (inputRef.current) {
        inputRef.current.files = dataTransfer.files;
      }
    } catch (error) {
      console.error("Compression error:", error);
      alert("Gagal mengompresi foto. Pastikan format gambar didukung.");
    } finally {
      setIsCompressing(false);
    }
  };

  return (
    <div className="grid gap-2">
      <Input 
        ref={inputRef}
        id={name} 
        name={name} 
        type="file" 
        accept="image/*" 
        multiple 
        required={required} 
        onChange={handleFileChange}
      />
      {isCompressing && (
        <p className="text-xs font-medium text-amber-500 animate-pulse">
          Mengompresi ukuran foto untuk menghemat kuota...
        </p>
      )}
    </div>
  );
}
