"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "sorch_setup_banner_dismissed";

export default function SetupBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY)) return;
    fetch("/api/v1/onboarding/status")
      .then(r => r.json())
      .then(data => { if (!data.is_complete) setShow(true); })
      .catch(() => {});
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Complete your setup to start screening seafarers</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200">
            <Link href="/onboarding">Finish Setup</Link>
          </Button>
          <button onClick={dismiss} className="text-amber-600 hover:text-amber-800 dark:text-amber-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
