"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Anchor, Key, Phone, Mic, CheckCircle, ChevronRight, ChevronLeft } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [openaiKey, setOpenaiKey] = useState("");
  const [sarvamKey, setSarvamKey] = useState("");
  const [sipDomain, setSipDomain] = useState("");
  const [sipUsername, setSipUsername] = useState("");
  const [sipPassword, setSipPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const saveAIServices = async () => {
    setSaving(true);
    try {
      await fetch("/api/v1/service-keys", {
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
      await fetch("/api/v1/telephony-configurations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "vobiz", sip_domain: sipDomain, sip_username: sipUsername, sip_password: sipPassword }),
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
          {[0,1,2,3,4].map(i => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
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
              <p className="text-muted-foreground mt-2">Set up in 5 minutes. Screen 2,000 seafarers today.</p>
            </div>
            <div className="text-left space-y-3 p-4 bg-muted/30 rounded-lg">
              {[
                "AI calls seafarers in Hindi/Hinglish",
                "Scores candidates 0–100 automatically",
                "Writes results to your Google Sheet",
                "Handles 2,000 leads the moment they drop",
              ].map(item => (
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
                <Input type="password" value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} placeholder="sk-..." />
                <p className="text-xs text-muted-foreground mt-1">GPT-4o-mini — conversation + scoring</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Sarvam AI API Key</label>
                <Input type="password" value={sarvamKey} onChange={e => setSarvamKey(e.target.value)} placeholder="sarvam-..." />
                <p className="text-xs text-muted-foreground mt-1">
                  Hindi/Hinglish STT + TTS. Get key at{" "}
                  <a href="https://sarvam.ai" target="_blank" rel="noopener noreferrer" className="underline">sarvam.ai</a>
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
            <button onClick={() => setStep(2)} className="w-full text-xs text-muted-foreground hover:underline">Skip for now</button>
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
                <Input value={sipDomain} onChange={e => setSipDomain(e.target.value)} placeholder="your-domain.vobiz.ai" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">SIP Username</label>
                <Input value={sipUsername} onChange={e => setSipUsername(e.target.value)} placeholder="username" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">SIP Password</label>
                <Input type="password" value={sipPassword} onChange={e => setSipPassword(e.target.value)} placeholder="password" />
              </div>
              <p className="text-xs text-muted-foreground">
                Get these from Vobiz AI after buying an Indian DID number. See <code>approach/07_manual_setup.md</code> for steps.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" />Back
              </Button>
              <Button onClick={saveTelephony} disabled={!sipDomain || !sipUsername || !sipPassword || saving} className="flex-1">
                {saving ? "Saving..." : "Save & Continue"}
              </Button>
            </div>
            <button onClick={() => setStep(3)} className="w-full text-xs text-muted-foreground hover:underline">Skip for now</button>
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
              <h2 className="text-2xl font-bold">Test Your Agent</h2>
              <p className="text-muted-foreground text-sm mt-1">Talk to the Maritime Screener in your browser</p>
            </div>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Go to Agents, open the Maritime Screener, and click Start Call. It will greet you in Hindi/Hinglish.
                </p>
                <Button className="w-full" onClick={() => router.push("/workflow")}>
                  <Mic className="h-4 w-4 mr-2" />Open Agents
                </Button>
              </CardContent>
            </Card>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" />Back
              </Button>
              <Button onClick={() => setStep(4)} variant="outline" className="flex-1">
                Skip <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
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
              <h2 className="text-2xl font-bold">You are ready!</h2>
              <p className="text-muted-foreground text-sm mt-1">Start screening seafarers at scale</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => router.push("/tasks/new")}>Create First Task</Button>
              <Button variant="outline" onClick={() => router.push("/overview")}>Go to Dashboard</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
