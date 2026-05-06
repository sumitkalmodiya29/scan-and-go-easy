import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export type Lang = "en" | "hi";

const STORAGE_KEY = "scango.lang";

const dict = {
  en: {
    appTagline: "Skip the queue. Forever.",
    signIn: "Sign In",
    signUp: "Create Account",
    email: "Email",
    password: "Password",
    fullName: "Full name",
    iAm: "I am a",
    customer: "Customer",
    staff: "Staff",
    welcome: "Welcome",
    pointsEarned: "GoPoints",
    recentPurchases: "Recent purchases",
    scanProducts: "Scan Products",
    startScanner: "Start Scanner",
    stopScanner: "Stop Scanner",
    cart: "Cart",
    items: "items",
    cartEmpty: "Your cart is empty",
    total: "Total",
    payNow: "Pay Now (UPI / Card)",
    processingPayment: "Processing payment...",
    demoBarcodes: "Demo barcodes",
    workingOffline: "Working Offline",
    backOnline: "Back online",
    sslSecured: "SSL Secured",
    verifiedPayment: "Verified Payment",
    receipt: "Exit Pass",
    paymentSuccessful: "Payment Successful",
    backToShop: "Back to shop",
    remaining: "remaining",
    qrExpired: "QR Expired",
    verified: "Verified",
    exitApproved: "Exit approved",
    showQr: "Show this QR at the exit. One-time use.",
    downloadPdf: "Download PDF Receipt",
    newTrip: "Start new shopping trip",
    checkedOut: "Checked Out",
    signOut: "Sign out",
    language: "Language",
    paymentQueued: "Saved offline — will pay when back online",
    syncedOrders: "Synced offline orders",
    limitedStock: "Limited",
    tapStartScan: "Tap \"Start Scanner\" to scan barcodes",
  },
  hi: {
    appTagline: "लाइन में लगना भूल जाइए।",
    signIn: "साइन इन करें",
    signUp: "खाता बनाएँ",
    email: "ईमेल",
    password: "पासवर्ड",
    fullName: "पूरा नाम",
    iAm: "मैं हूँ",
    customer: "ग्राहक",
    staff: "स्टाफ",
    welcome: "स्वागत है",
    pointsEarned: "गो-पॉइंट्स",
    recentPurchases: "हाल की खरीदारी",
    scanProducts: "प्रोडक्ट स्कैन करें",
    startScanner: "स्कैनर शुरू करें",
    stopScanner: "स्कैनर बंद करें",
    cart: "कार्ट",
    items: "सामान",
    cartEmpty: "आपका कार्ट खाली है",
    total: "कुल",
    payNow: "अभी भुगतान करें (UPI / कार्ड)",
    processingPayment: "भुगतान हो रहा है...",
    demoBarcodes: "डेमो बारकोड",
    workingOffline: "ऑफ़लाइन मोड",
    backOnline: "फिर से ऑनलाइन",
    sslSecured: "SSL सुरक्षित",
    verifiedPayment: "सत्यापित भुगतान",
    receipt: "एग्ज़िट पास",
    paymentSuccessful: "भुगतान सफल",
    backToShop: "दुकान पर वापस",
    remaining: "बाकी",
    qrExpired: "QR की समय-सीमा समाप्त",
    verified: "सत्यापित",
    exitApproved: "बाहर जाने की अनुमति",
    showQr: "बाहर निकलते समय यह QR दिखाएँ। केवल एक बार उपयोग।",
    downloadPdf: "PDF रसीद डाउनलोड करें",
    newTrip: "नई खरीदारी शुरू करें",
    checkedOut: "चेकआउट हो गया",
    signOut: "साइन आउट",
    language: "भाषा",
    paymentQueued: "ऑफ़लाइन सेव किया गया — कनेक्शन आते ही भुगतान होगा",
    syncedOrders: "ऑफ़लाइन ऑर्डर सिंक हुए",
    limitedStock: "सीमित",
    tapStartScan: "बारकोड स्कैन करने के लिए \"स्कैनर शुरू करें\" दबाएँ",
  },
} as const;

export type TKey = keyof typeof dict["en"];

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: TKey) => string;
}
const I18nCtx = createContext<Ctx | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return ((localStorage.getItem(STORAGE_KEY) as Lang) ?? "en");
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* noop */ }
  }, []);

  const t = useCallback((k: TKey) => dict[lang][k] ?? dict.en[k] ?? k, [lang]);

  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
};

export const useT = () => {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useT outside I18nProvider");
  return c;
};
