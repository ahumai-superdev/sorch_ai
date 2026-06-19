"use client";

import { Anchor, Check, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";

// Maritime vocabulary constants (from approach/06_maritime_agent_spec.md)
const SEAFARER_RANKS = [
  "Master", "Chief Officer", "Second Officer", "Third Officer",
  "Chief Engineer", "Second Engineer", "Third Engineer", "Fourth Engineer",
  "Bosun", "AB Seaman", "OS", "Fitter", "Wiper", "Cook",
  "Electrician", "ETO", "Cadet",
];

const STCW_CERTIFICATES = [
  "STCW Basic Safety", "BOSIET", "HUET", "COC", "CDC",
  "GMDSS", "ECDIS", "BRM", "ERM", "ARPA", "Medical First Aid",
  "Proficiency in Survival Craft", "Advanced Fire Fighting",
  "Tanker Familiarization", "IMDG", "IGF Code",
];

const MARITIME_VOCAB_HINTS = [...SEAFARER_RANKS, ...STCW_CERTIFICATES].join(", ");

// TypeScript interfaces
interface FormState {
  template: string;
  csvFileKey: string;
  csvFileName: string;
  cvFiles: File[];
  taskName: string;
  customInstructions: string;
}

interface PresignedUploadUrlResponse {
  upload_url: string;
  file_key: string;
  expires_in: number;
}

const STEPS = ["Select Template", "Upload Contacts", "Configure"];

export default function NewTaskPage() {
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    template: "maritime_screener",
    csvFileKey: "",
    csvFileName: "",
    cvFiles: [],
    taskName: "",
    customInstructions: "",
  });
  const [csvUploading, setCsvUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadTab, setUploadTab] = useState<"csv" | "cv">("csv");
  const [dragOver, setDragOver] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleCsvSelect = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".csv")) return;
      setCsvUploading(true);
      try {
        const token = await getAccessToken();
        const presignRes = await fetch("/api/v1/s3/presigned-upload-url", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ file_name: file.name, file_size: file.size, content_type: "text/csv" }),
        });
        const presignData: PresignedUploadUrlResponse = await presignRes.json();
        await fetch(presignData.upload_url, { method: "PUT", body: file, headers: { "Content-Type": "text/csv" } });
        setForm((f) => ({ ...f, csvFileKey: presignData.file_key, csvFileName: file.name }));
      } finally {
        setCsvUploading(false);
      }
    },
    [getAccessToken]
  );

  const handleCvDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf");
    setForm((f) => ({ ...f, cvFiles: [...f.cvFiles, ...dropped].slice(0, 50) }));
  }, []);

  const handleSubmit = async () => {
    if (!form.taskName.trim()) return;
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.taskName,
          template: form.template,
          source_type: "csv",
          source_id: form.csvFileKey,
          custom_instructions: form.customInstructions,
        }),
      });
      const data = await res.json();
      router.push(`/tasks/${data.id}`);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">New Task</h1>
        <p className="text-muted-foreground text-sm mt-1">Set up a batch maritime screening run</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8" aria-label="Step indicator">
        <span className="text-sm text-muted-foreground mr-2">
          Step {step + 1} of {STEPS.length}
        </span>
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span className={`text-sm ${i === step ? "font-medium" : "text-muted-foreground"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-border mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1 — Select Template */}
      {step === 0 && (
        <div className="space-y-4">
          <Card
            className="border-2 border-primary cursor-pointer"
            data-testid="maritime-screener-card"
            onClick={() => setForm((f) => ({ ...f, template: "maritime_screener" }))}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Anchor className="h-4 w-4" />
                  Maritime Screener
                </CardTitle>
                <Badge>Selected</Badge>
              </div>
              <CardDescription>
                AI-powered Hindi/Hinglish phone screening for seafarers. Scores candidates 0–100 on availability,
                rank, certificates, vessel preference, and communication.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {["Hindi/Hinglish", "Sarvam AI", "GPT-4o-mini", "Auto-scoring"].map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end mt-6">
            <Button onClick={() => setStep(1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 — Upload Contacts */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Simple tab bar — avoids Radix Tabs JSDOM rendering issues */}
          <div className="flex border-b mb-4">
            <button
              role="tab"
              aria-selected={uploadTab === "csv"}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                uploadTab === "csv" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
              onClick={() => setUploadTab("csv")}
            >
              CSV Upload
            </button>
            <button
              role="tab"
              aria-selected={uploadTab === "cv"}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                uploadTab === "cv" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
              onClick={() => setUploadTab("cv")}
            >
              CV Upload
            </button>
          </div>

          {uploadTab === "csv" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a CSV file with candidate phone numbers and names.
              </p>
              <div className="border rounded-lg overflow-hidden text-sm">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">phone_number</th>
                      <th className="text-left px-3 py-2 font-medium">name</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="px-3 py-2 text-muted-foreground">+919876543210</td>
                      <td className="px-3 py-2 text-muted-foreground">Rajesh Kumar</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-3 py-2 text-muted-foreground">+918765432109</td>
                      <td className="px-3 py-2 text-muted-foreground">Suresh Patel</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3">
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCsvSelect(file);
                  }}
                />
                <Button variant="outline" onClick={() => csvInputRef.current?.click()} disabled={csvUploading}>
                  {csvUploading ? "Uploading..." : "Choose CSV File"}
                </Button>
                {form.csvFileName && <span className="text-sm text-primary">{form.csvFileName}</span>}
              </div>
            </div>
          )}

          {uploadTab === "cv" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload PDF resumes (max 50 files). Contact details will be extracted automatically.
              </p>
              <div
                data-testid="cv-dropzone"
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver ? "border-primary bg-primary/5" : "border-border"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleCvDrop}
              >
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">Drag &amp; drop PDF files here</p>
                <p className="text-xs text-muted-foreground mt-1">Max 50 files</p>
                {form.cvFiles.length > 0 && (
                  <p className="text-sm text-primary mt-3 font-medium">
                    {form.cvFiles.length} file{form.cvFiles.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground italic">
                CV parsing coming soon — files are stored but not yet parsed automatically.
              </p>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button onClick={() => setStep(2)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Configure */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block" htmlFor="task-name">
              Task Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="task-name"
              value={form.taskName}
              onChange={(e) => setForm((f) => ({ ...f, taskName: e.target.value }))}
              placeholder="e.g. Chief Engineers — March 2026"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block" htmlFor="custom-instructions">
              Custom Instructions{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              id="custom-instructions"
              value={form.customInstructions}
              onChange={(e) => setForm((f) => ({ ...f, customInstructions: e.target.value }))}
              placeholder="e.g. Focus on candidates with BOSIET certification. Ask about LNG carrier experience."
              rows={4}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block" htmlFor="vocab-hints">
              Maritime Vocabulary Hints{" "}
              <span className="text-muted-foreground font-normal">(pre-loaded)</span>
            </label>
            <Textarea
              id="vocab-hints"
              value={MARITIME_VOCAB_HINTS}
              readOnly
              rows={3}
              className="text-xs text-muted-foreground bg-muted/30"
            />
          </div>
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={!form.taskName.trim() || submitting}>
              {submitting ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
