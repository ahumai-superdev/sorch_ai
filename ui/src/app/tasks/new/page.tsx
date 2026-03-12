"use client";

import { Anchor, Check,ChevronLeft, ChevronRight, FileText, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const STEPS = ["Template", "Contacts", "Configure"];

export default function NewTaskPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [taskName, setTaskName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [uploadType, setUploadType] = useState<"csv" | "cv">("csv");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!taskName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: taskName, template: "maritime_screener", custom_instructions: instructions }),
      });
      const data = await res.json();
      router.push(`/tasks/${data.id}`);
    } catch { setSubmitting(false); }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">New Task</h1>
        <p className="text-muted-foreground text-sm mt-1">Set up a batch maritime screening run</p>
      </div>

      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {i < step ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span className={`text-sm ${i === step ? "font-medium" : "text-muted-foreground"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-border mx-1" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <Card className="border-2 border-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Anchor className="h-4 w-4" />Maritime Screener
                </CardTitle>
                <Badge>Selected</Badge>
              </div>
              <CardDescription>
                Automated Hindi/Hinglish voice screening. Verifies availability, rank, certificates, vessel preference, joining date. Scores 0–100.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {["Hindi/Hinglish", "Sarvam AI", "GPT-4o-mini", "Auto-scoring"].map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end mt-6">
            <Button onClick={() => setStep(1)}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className={`cursor-pointer border-2 ${uploadType === "csv" ? "border-primary" : "border-border"}`} onClick={() => setUploadType("csv")}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />CSV File</CardTitle>
                <CardDescription className="text-xs">Upload phone numbers + names</CardDescription>
              </CardHeader>
            </Card>
            <Card className={`cursor-pointer border-2 ${uploadType === "cv" ? "border-primary" : "border-border"}`} onClick={() => setUploadType("cv")}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Upload className="h-4 w-4" />Bulk CVs</CardTitle>
                <CardDescription className="text-xs">Upload PDF resumes (max 50)</CardDescription>
              </CardHeader>
            </Card>
          </div>
          <div className="p-4 border rounded-lg bg-muted/30">
            {uploadType === "csv" ? (
              <>
                <p className="text-xs text-muted-foreground mb-2">Format: <code className="bg-muted px-1 rounded">phone_number,name</code></p>
                <p className="text-xs text-muted-foreground mb-3">Example: <code className="bg-muted px-1 rounded">+919876543210,Rajesh Kumar</code></p>
                <input type="file" accept=".csv" className="text-sm" />
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">Upload up to 50 PDF resumes. AI extracts contact details automatically.</p>
                <input type="file" accept=".pdf" multiple className="text-sm" />
              </>
            )}
          </div>
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setStep(0)}><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
            <Button onClick={() => setStep(2)}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Task Name *</label>
            <Input value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="e.g. Chief Engineers — March 2026" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Custom Instructions <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="e.g. Focus on candidates with BOSIET certification. Ask about LNG carrier experience."
              rows={4}
            />
          </div>
          <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
            Maritime vocabulary pre-loaded: STCW, COC, CDC, BOSIET, vessel types, seafarer ranks
          </div>
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
            <Button onClick={handleSubmit} disabled={!taskName.trim() || submitting}>
              {submitting ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
