import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ScanLine, ShieldCheck } from "lucide-react";
import { useT } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { TrustBadges } from "@/components/TrustBadges";

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 chars").max(72),
  full_name: z.string().trim().min(1).max(100).optional(),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [signupRole, setSignupRole] = useState<"customer" | "staff">("customer");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && role) {
      navigate(role === "customer" ? "/shop" : "/staff", { replace: true });
    }
  }, [user, role, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Welcome back!");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, full_name: fullName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, role: signupRole },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Account created!");
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4 relative">
      <div className="absolute top-3 right-3"><LanguageToggle /></div>
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <ScanLine className="h-7 w-7 text-emerald" />
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">ScanGo</span>
        </Link>
        <Card className="p-6 glass-strong shadow-elegant border-0">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="signin">{t("signIn")}</TabsTrigger>
              <TabsTrigger value="signup">{t("signUp")}</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="password">{t("password")}</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full tappable gradient-primary text-primary-foreground border-0" disabled={busy}>
                  {busy ? "..." : t("signIn")}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="fn">{t("fullName")}</Label>
                  <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="email2">{t("email")}</Label>
                  <Input id="email2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="password2">{t("password")}</Label>
                  <Input id="password2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                <div>
                  <Label className="mb-2 block">{t("iAm")}</Label>
                  <RadioGroup value={signupRole} onValueChange={(v) => setSignupRole(v as "customer" | "staff")} className="grid grid-cols-2 gap-2">
                    <Label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer hover:bg-secondary transition-smooth">
                      <RadioGroupItem value="customer" /> {t("customer")}
                    </Label>
                    <Label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer hover:bg-secondary transition-smooth">
                      <RadioGroupItem value="staff" /> <ShieldCheck className="h-4 w-4" /> {t("staff")}
                    </Label>
                  </RadioGroup>
                </div>
                <Button type="submit" className="w-full tappable gradient-primary text-primary-foreground border-0" disabled={busy}>
                  {busy ? "..." : t("signUp")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="mt-5 pt-4 border-t border-white/10">
            <TrustBadges />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
