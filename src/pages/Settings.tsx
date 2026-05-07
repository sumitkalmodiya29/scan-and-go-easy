import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { User, Languages, HelpCircle, ShieldCheck, Trash2, Wallet, MessageCircle, Fingerprint, Mail, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { loadSettings, saveSettings, clearAppCache, UserSettings } from "@/lib/settings";

const Settings = () => {
  const { user } = useAuth();
  const { t, lang, setLang } = useT();
  const navigate = useNavigate();
  const [profileName, setProfileName] = useState("");
  const [points, setPoints] = useState(0);
  const [settings, setSettings] = useState<UserSettings>({ budgetLimit: 0, biometricLock: false });
  const [budgetInput, setBudgetInput] = useState("");

  useEffect(() => {
    loadSettings().then((s) => { setSettings(s); setBudgetInput(s.budgetLimit ? String(s.budgetLimit) : ""); });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfileName(data?.full_name ?? ""));
    supabase.from("orders").select("total").eq("user_id", user.id)
      .then(({ data }) => setPoints(Math.floor(((data ?? []) as { total: number }[]).reduce((s, o) => s + Number(o.total) * 0.01, 0))));
  }, [user]);

  const persist = async (s: UserSettings) => { setSettings(s); await saveSettings(s); };

  const handleSaveBudget = async () => {
    const n = Math.max(0, Number(budgetInput) || 0);
    await persist({ ...settings, budgetLimit: n });
    toast.success(`${t("budgetLimit")}: ₹${n}`);
  };

  const handleClearCache = async () => {
    await clearAppCache();
    toast.success(t("cacheCleared"));
    setTimeout(() => location.reload(), 600);
  };

  return (
    <AppLayout title={t("settings")}>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Profile */}
        <Card className="p-5 glass-strong shadow-elegant border-0 animate-float-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground">
              <User className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-widest text-emerald flex items-center gap-1"><Sparkles className="h-3 w-3" /> {t("profile")}</p>
              <h2 className="text-lg font-bold truncate">{profileName || user?.email || "—"}</h2>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><Mail className="h-3 w-3" />{user?.email}</p>
            </div>
            <Badge className="bg-gold/20 text-gold border-gold/30">{points} {t("pointsEarned")}</Badge>
          </div>
          <div className="text-xs font-mono text-muted-foreground p-2 rounded-lg glass">
            {t("userId")}: <span className="text-foreground">{user?.id?.slice(0, 18)}…</span>
          </div>
        </Card>

        {/* Language */}
        <Card className="p-5 glass shadow-soft border-0">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Languages className="h-4 w-4 text-emerald" /> {t("language")}</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={lang === "en" ? "default" : "outline"} className="tappable" onClick={() => setLang("en")}>English</Button>
            <Button variant={lang === "hi" ? "default" : "outline"} className="tappable" onClick={() => setLang("hi")}>हिंदी</Button>
          </div>
        </Card>

        {/* Budget Tracker */}
        <Card className="p-5 glass shadow-soft border-0">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Wallet className="h-4 w-4 text-gold" /> {t("budgetTracker")}</h3>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="budget" className="text-xs">{t("budgetLimit")} (₹)</Label>
              <Input id="budget" inputMode="numeric" type="number" min={0} value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)} placeholder="0 = off" />
            </div>
            <Button onClick={handleSaveBudget} className="tappable">{t("setBudget")}</Button>
          </div>
        </Card>

        {/* Security */}
        <Card className="p-5 glass shadow-soft border-0">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald" /> {t("security")}</h3>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-emerald" />
              <span className="text-sm">{t("biometricLock")}</span>
            </div>
            <Switch checked={settings.biometricLock}
              onCheckedChange={(v) => persist({ ...settings, biometricLock: v }).then(() => toast.success(`${t("biometricLock")}: ${v ? "ON" : "OFF"}`))} />
          </div>
          <Button variant="outline" className="w-full tappable mt-2" onClick={handleClearCache}>
            <Trash2 className="h-4 w-4 mr-2" /> {t("clearCache")}
          </Button>
        </Card>

        {/* Help & Support */}
        <Card className="p-5 glass shadow-soft border-0">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><HelpCircle className="h-4 w-4 text-gold" /> {t("helpSupport")}</h3>
          <Button variant="secondary" className="w-full tappable mb-3"
            onClick={() => toast.message(t("chatAdmin"), { description: "support@scango.app" })}>
            <MessageCircle className="h-4 w-4 mr-2" /> {t("chatAdmin")}
          </Button>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("faq")}</p>
          <Accordion type="single" collapsible>
            {([1, 2, 3] as const).map((i) => (
              <AccordionItem key={i} value={`q${i}`}>
                <AccordionTrigger className="text-sm">{t(`faqQ${i}` as any)}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{t(`faqA${i}` as any)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        <Button variant="ghost" className="w-full tappable" onClick={() => navigate(-1)}>{t("backToShop")}</Button>
      </div>
    </AppLayout>
  );
};

export default Settings;
