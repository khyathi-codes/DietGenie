   export function getISTDateString(): string {
     const now = new Date();
     const istOffsetMs = 5.5 * 60 * 60 * 1000; // IST = UTC+5:30
     const istTime = new Date(now.getTime() + istOffsetMs);
     return istTime.toISOString().split("T")[0];
   }