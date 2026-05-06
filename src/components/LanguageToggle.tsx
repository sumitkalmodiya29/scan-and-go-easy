import { useT } from "@/lib/i18n";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

export const LanguageToggle = () => {
  const { lang, setLang } = useT();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="tappable gap-1.5 h-8 px-2 text-xs"
      onClick={() => setLang(lang === "en" ? "hi" : "en")}
      aria-label="Toggle language"
    >
      <Languages className="h-3.5 w-3.5" />
      <span className="font-semibold">{lang === "en" ? "EN" : "हिं"}</span>
      <span className="text-muted-foreground">/ {lang === "en" ? "हिं" : "EN"}</span>
    </Button>
  );
};
