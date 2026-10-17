"use client";

import { useEffect } from "react";
import { warmUpBackend } from "@/lib/api";

export function Warmup(): null {
  useEffect(() => {
    warmUpBackend();
  }, []);

  return null;
}
