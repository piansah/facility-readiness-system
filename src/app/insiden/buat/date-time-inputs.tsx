"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DateTimeInputs() {
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    
    // Format YYYY-MM-DD for input type="date"
    const dateStr = now.toLocaleDateString('en-CA');
    
    // Format HH:mm for input type="time"
    const timeStr = now.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });

    setCurrentDate(dateStr);
    setCurrentTime(timeStr);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="grid min-w-0 gap-2">
        <Label htmlFor="incident_date">Tanggal Kegiatan</Label>
        <Input 
          id="incident_date" 
          name="incident_date" 
          type="date" 
          required 
          defaultValue={currentDate}
          key={`date-${currentDate}`} // Force re-render when date is set to avoid hydration mismatch
        />
      </div>
      <div className="grid min-w-0 gap-2">
        <Label htmlFor="incident_time_only">Jam Mulai</Label>
        <Input 
          id="incident_time_only" 
          name="incident_time_only" 
          type="time" 
          required 
          defaultValue={currentTime}
          key={`time-${currentTime}`} // Force re-render when time is set
        />
      </div>
      <div className="grid min-w-0 gap-2">
        <Label htmlFor="resolved_time_only">Jam Selesai</Label>
        <Input 
          id="resolved_time_only" 
          name="resolved_time_only" 
          type="time" 
        />
      </div>
    </div>
  );
}
