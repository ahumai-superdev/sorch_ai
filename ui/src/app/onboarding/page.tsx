"use client";

import { Anchor, CheckCircle, ChevronLeft, ChevronRight, Key, Mic, Phone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [openaiKey, setOpenaiKey] = useState("");
  const [sarvamKey, setSarvamKey] = useState("");
  const [sipDomain, setSipDomain] = useState("");
  const [sipUsername, setSipUsername] = useState("");
  const [sipPassword, setSipPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [maritimeWorkflowId, setMaritimeWorkflowId] = useState<string | null>(null);

  useEffect(() => {
    if (step === 3) {
      fetch("/api/v1/workflow/fetch")
        .then((r) => r.json())
        .then((data) => {
          const workflows = Array.isArray(data) ? data : (data.workflows ?? []);
          const maritime = workflows.find(
            (w: { id: string; name: string }) => w.name === "Maritime Screener"
          );
          if (maritime) setMaritimeWorkflowId(maritime.id);
        })
        .catch(() => {});
    }
  }, [step]);

  const saveAIServices = async () => {
    setSaving(true);
    try {
      await fetch("/api/v1/user/service-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openai_api_key: openaiKey, sarvam_api_key: sarvamKey }),
      });
    } finally {
      setSaving(false);
      setStep(2);
    }
  };

  const saveTelephony = async () => {
    setSaving(true);
    try {
      await fetch("/api/v1/organizations/telephony-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "vobiz",
          sip_domain: sipDomain,
          sip_username: sipUsername,
          sip_password: sipPassword,
        }),
      });
    } finally {
      setSaving(false);
      setStep(3);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-lg">
        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 0 && (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Anchor className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold">Welcome to Sorch AI</h1>
              <p className="text-muted-foreground mt-2">Let us get you set up in 5 minutes</p>
            </div>
            <div className="text-left space-y-3 p-4 bg-muted/30 rounded-lg">
              {[
                "AI calls seafarers in Hindi/Hinglish",
                "Scores candidates 0–100 automatically",
                "Writes results to your Google Sheet",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <Button size="lg" className="w-full" onClick={() => setStep(1)}>
              Get Started <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 2: AI Services */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Key className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">AI Services</h2>
                <p className="text-muted-foreground text-sm">Connect your AI providers</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">OpenAI API Key</label>
                <Input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                />
                <p className="text-xs text-muted-foreground mt-1">GPT-4o-mini — conversation + scoring</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Sarvam AI API Key</label>
                <Input
                  type="password"
                  value={sarvamKey}
                  onChange={(e) => setSarvamKey(e.target.value)}
                  placeholder="sarvam-..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Get Sarvam AI key at{" "}
                  <a href="https://sarvam.ai" target="_blank" rel="noopener noreferrer" className="underline">
                    sarvam.ai
                  </a>{" "}
                  — needed for Hindi/Hinglish voice
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" />Back
              </Button>
              <Button onClick={saveAIServices} disabled={!openaiKey || !sarvamKey || saving} className="flex-1">
                {saving ? "Saving..." : "Save & Continue"}
              </Button>
            </div>
            <button onClick={() => setStep(2)} className="w-full text-xs text-muted-foreground hover:underline">
              Skip for now
            </button>
          </div>
        )}

        {/* Step 3: Telephony */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Phone className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Telephony</h2>
                <p className="text-muted-foreground text-sm">Connect Vobiz AI for outbound calls</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">SIP Domain</label>
                <Input
                  value={sipDomain}
                  onChange={(e) => setSipDomain(e.target.value)}
                  placeholder="your-domain.vobiz.ai"
                  aria-label="SIP Domain"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">SIP Username</label>
                <Input
                  value={sipUsername}
                  onChange={(e) => setSipUsername(e.target.value)}
                  placeholder="username"
                  aria-label="SIP Username"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">SIP Password</label>
                <Input
                  type="password"
                  value={sipPassword}
                  onChange={(e) => setSipPassword(e.target.value)}
                  placeholder="password"
                  aria-label="SIP Password"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Get these from Vobiz AI dashboard after buying an Indian DID number. See{" "}
                <code>approach/07_manual_setup.md</code> for step-by-step.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" />Back
              </Button>
              <Button
                onClick={saveTelephony}
                disabled={!sipDomain || !sipUsername || !sipPassword || saving}
                className="flex-1"
              >
                {saving ? "Saving..." : "Save & Continue"}
              </Button>
            </div>
            <button onClick={() => setStep(3)} className="w-full text-xs text-muted-foreground hover:underline">
              Skip for now
            </button>
          </div>
        )}

        {/* Step 4: Test Agent */}
        {step === 3 && (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mic className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Talk to your Maritime Screener</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Click Start Call to test your agent in the browser. It will greet you in Hindi/Hinglish.
              </p>
            </div>
            <Card>
              <CardContent className="pt-6">
                {maritimeWorkflowId ? (
                  <Link href={`/workflow/${maritimeWorkflowId}/run/new`} className="block">
                    <Button className="w-full" size="lg">
                      <Mic className="h-4 w-4 mr-2" />Start Call
                    </Button>
                  </Link>
                ) : (
                  <Button className="w-full" size="lg" disabled>
                    <Mic className="h-4 w-4 mr-2" />No agent configured yet
                  </Button>
                )}
              </CardContent>
            </Card>
            <Button variant="outline" onClick={() => setStep(2)} className="w-full">
              <ChevronLeft className="h-4 w-4 mr-1" />Back
            </Button>
            <button onClick={() => setStep(4)} className="w-full text-xs text-muted-foreground hover:underline">
              Skip for now
            </button>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 4 && (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">You are ready to screen seafarers!</h2>
              <p className="text-muted-foreground text-sm mt-1">Start screening seafarers at scale</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/tasks/new">
                <Button className="w-full">Create First Task</Button>
              </Link>
              <Link href="/overview">
                <Button variant="outline" className="w-full">Go to Dashboard</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
