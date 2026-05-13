"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function RefreshOnDateChange() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Simpan tanggal saat ini di client sebagai patokan awal
    const clientInitialDate = new Date().toLocaleDateString('en-CA');
    
    const interval = setInterval(() => {
      const currentDate = new Date().toLocaleDateString('en-CA');
      if (currentDate !== clientInitialDate) {
        // Hanya refresh jika tanggal di browser benar-benar sudah berganti
        router.refresh();
      }
    }, 60000); // Cek setiap menit

    return () => clearInterval(interval);
  }, [router]);

  if (!mounted) return null;
  
  return null;
}
