"use client";

import { useEffect, useRef } from "react";
import { setupAxiosInterceptor } from "@/src/utils/axiosInterceptor";

/** Initialises the global Axios interceptor once (client-side only). */
export default function AxiosInit() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      setupAxiosInterceptor();
      initialized.current = true;
    }
  }, []);

  return null;
}
