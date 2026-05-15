"use client";

import { useState } from "react";
import { LogOut, AlertCircle } from "lucide-react";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ProfileLogoutButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        variant="outline" 
        className="w-full h-10 rounded-xl gap-2 font-bold text-xs border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all active:scale-95"
      >
        <LogOut className="h-3.5 w-3.5" />
        Keluar dari Sistem
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm border-slate-800 bg-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-5 w-5" />
                Konfirmasi Keluar
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-400">
              Apakah Anda yakin ingin keluar dari sistem? Anda harus login kembali untuk mengakses dashboard.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              variant="destructive" 
              onClick={() => logout()}
              className="w-full bg-red-600 hover:bg-red-500 font-bold"
            >
              Ya, Logout Sekarang
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setIsOpen(false)}
              className="w-full text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
