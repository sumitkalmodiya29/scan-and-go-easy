import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export type Lang = "en" | "hi";

const STORAGE_KEY = "scango.lang";

const dict = {
  en: {
    appTagline: "Skip the queue. Forever.",
    signIn: "Sign In", signUp: "Create Account",
    email: "Email", password: "Password", fullName: "Full name",
    iAm: "I am a", customer: "Customer", staff: "Staff",
    welcome: "Welcome", pointsEarned: "GoPoints", recentPurchases: "Recent purchases",
    scanProducts: "Scan Products", startScanner: "Start Scanner", stopScanner: "Stop Scanner",
    cart: "Cart", items: "items", cartEmpty: "Your cart is empty",
    total: "Total", payNow: "Pay Now (UPI / Card)", processingPayment: "Processing payment...",
    demoBarcodes: "Demo barcodes", workingOffline: "Working Offline", backOnline: "Back online",
    sslSecured: "SSL Secured", verifiedPayment: "Verified Payment",
    receipt: "Exit Pass", paymentSuccessful: "Payment Successful",
    backToShop: "Back to shop", remaining: "remaining", qrExpired: "QR Expired",
    verified: "Verified", exitApproved: "Exit approved",
    showQr: "Show this QR at the exit. One-time use.",
    downloadPdf: "Download PDF Receipt", newTrip: "Start new shopping trip",
    checkedOut: "Checked Out", signOut: "Sign out", language: "Language",
    paymentQueued: "Saved offline — will pay when back online",
    syncedOrders: "Synced offline orders", limitedStock: "Limited",
    tapStartScan: "Tap \"Start Scanner\" to scan barcodes",
    settings: "Settings", profile: "Profile", userId: "User ID",
    helpSupport: "Help & Support", chatAdmin: "Chat with Admin", faq: "FAQ",
    security: "Security", biometricLock: "Biometric Lock", clearCache: "Clear Cache",
    cacheCleared: "Cache cleared",
    budgetTracker: "Budget Tracker", budgetLimit: "Budget Limit", setBudget: "Set Budget",
    overBudget: "Over budget!", nearBudget: "Near budget limit",
    voiceSearch: "Voice Search", listening: "Listening…", sayItem: "Say an item name",
    e2eEncrypted: "End-to-End Encrypted", verifiedBy: "Verified by ScanGo Security",
    arGuide: "AR Guidance Active", scanning: "Scanning…",
    holoVerifying: "Awaiting Verification",
    faqQ1: "How do I pay?", faqA1: "Scan items, tap Pay Now, then show your QR at the exit.",
    faqQ2: "Is my payment secure?", faqA2: "Yes — all data is end-to-end encrypted and PCI-DSS compliant.",
    faqQ3: "Does it work offline?", faqA3: "Yes — your cart and settings sync automatically when back online.",
    save: "Save", cancel: "Cancel",
    namasteTitle: "Namaste Customer",
    namasteSubtitle: "Welcome to ScanGo",
    namasteTagline: "A premium contactless shopping experience",
    enterStore: "Enter Store",
    playWelcome: "Play welcome",
    choosePayment: "Choose payment method",
    payDigital: "Pay Online (UPI / Card)",
    payDigitalDesc: "Instant — get your exit QR right away",
    payCash: "Pay with Cash at Exit Counter",
    payCashDesc: "Show the Cash Pending QR to staff and hand over cash",
    cashPendingTitle: "Cash Pending Settlement",
    cashPendingInstructions: "Proceed to any open exit counter, hand over the exact cash amount to the staff, and let them scan this QR to finalize your checkout.",
    cashAmountDue: "Amount due (cash)",
    shortestQueue: "shortest cash queue right now",
    cashReceivedApprove: "Cash Received & Approve Exit",
    pendingCash: "Pending cash",
    settled: "Settled",
    counter: "Counter",
  },
  hi: {
    appTagline: "लाइन में लगना भूल जाइए।",
    signIn: "साइन इन करें", signUp: "खाता बनाएँ",
    email: "ईमेल", password: "पासवर्ड", fullName: "पूरा नाम",
    iAm: "मैं हूँ", customer: "ग्राहक", staff: "स्टाफ",
    welcome: "स्वागत है", pointsEarned: "गो-पॉइंट्स", recentPurchases: "हाल की खरीदारी",
    scanProducts: "प्रोडक्ट स्कैन करें", startScanner: "स्कैनर शुरू करें", stopScanner: "स्कैनर बंद करें",
    cart: "कार्ट", items: "सामान", cartEmpty: "आपका कार्ट खाली है",
    total: "कुल", payNow: "अभी भुगतान करें (UPI / कार्ड)", processingPayment: "भुगतान हो रहा है...",
    demoBarcodes: "डेमो बारकोड", workingOffline: "ऑफ़लाइन मोड", backOnline: "फिर से ऑनलाइन",
    sslSecured: "SSL सुरक्षित", verifiedPayment: "सत्यापित भुगतान",
    receipt: "एग्ज़िट पास", paymentSuccessful: "भुगतान सफल",
    backToShop: "दुकान पर वापस", remaining: "बाकी", qrExpired: "QR की समय-सीमा समाप्त",
    verified: "सत्यापित", exitApproved: "बाहर जाने की अनुमति",
    showQr: "बाहर निकलते समय यह QR दिखाएँ। केवल एक बार उपयोग।",
    downloadPdf: "PDF रसीद डाउनलोड करें", newTrip: "नई खरीदारी शुरू करें",
    checkedOut: "चेकआउट हो गया", signOut: "साइन आउट", language: "भाषा",
    paymentQueued: "ऑफ़लाइन सेव किया गया — कनेक्शन आते ही भुगतान होगा",
    syncedOrders: "ऑफ़लाइन ऑर्डर सिंक हुए", limitedStock: "सीमित",
    tapStartScan: "बारकोड स्कैन करने के लिए \"स्कैनर शुरू करें\" दबाएँ",
    settings: "सेटिंग्स", profile: "प्रोफ़ाइल", userId: "यूज़र आईडी",
    helpSupport: "मदद और सहायता", chatAdmin: "एडमिन से चैट", faq: "सामान्य प्रश्न",
    security: "सुरक्षा", biometricLock: "बायोमेट्रिक लॉक", clearCache: "कैश साफ़ करें",
    cacheCleared: "कैश साफ़ हो गया",
    budgetTracker: "बजट ट्रैकर", budgetLimit: "बजट सीमा", setBudget: "बजट सेट करें",
    overBudget: "बजट से ज़्यादा!", nearBudget: "बजट सीमा के पास",
    voiceSearch: "वॉइस सर्च", listening: "सुन रहा है…", sayItem: "किसी सामान का नाम बोलें",
    e2eEncrypted: "एंड-टू-एंड एन्क्रिप्टेड", verifiedBy: "ScanGo Security द्वारा सत्यापित",
    arGuide: "AR गाइडेंस सक्रिय", scanning: "स्कैन हो रहा है…",
    holoVerifying: "सत्यापन की प्रतीक्षा",
    faqQ1: "भुगतान कैसे करें?", faqA1: "सामान स्कैन करें, Pay Now दबाएँ, और बाहर निकलते समय QR दिखाएँ।",
    faqQ2: "क्या मेरा भुगतान सुरक्षित है?", faqA2: "हाँ — सारा डेटा एंड-टू-एंड एन्क्रिप्टेड और PCI-DSS अनुपालित है।",
    faqQ3: "क्या यह ऑफ़लाइन काम करता है?", faqA3: "हाँ — आपका कार्ट और सेटिंग्स ऑनलाइन होते ही सिंक हो जाती हैं।",
    save: "सहेजें", cancel: "रद्द करें",
    namasteTitle: "नमस्ते कस्टमर",
    namasteSubtitle: "ScanGo में आपका स्वागत है",
    namasteTagline: "एक प्रीमियम कॉन्टैक्टलेस शॉपिंग अनुभव",
    enterStore: "स्टोर में प्रवेश करें",
    playWelcome: "स्वागत सुनें",
    choosePayment: "भुगतान का तरीका चुनें",
    payDigital: "ऑनलाइन भुगतान (UPI / कार्ड)",
    payDigitalDesc: "तुरंत — एग्ज़िट QR तुरंत मिलेगा",
    payCash: "एग्ज़िट काउंटर पर कैश से भुगतान",
    payCashDesc: "स्टाफ को Cash Pending QR दिखाएँ और नकद दें",
    cashPendingTitle: "नकद भुगतान बाकी",
    cashPendingInstructions: "किसी भी खुले एग्ज़िट काउंटर पर जाएँ, सही नकद राशि स्टाफ को दें, और स्टाफ से यह QR स्कैन करवाकर चेकआउट पूरा करें।",
    cashAmountDue: "देय राशि (नकद)",
    shortestQueue: "में सबसे छोटी कैश लाइन है",
    cashReceivedApprove: "नकद प्राप्त — एग्ज़िट मंज़ूर करें",
    pendingCash: "नकद बाकी",
    settled: "निपटान हो गया",
    counter: "काउंटर",
  },
} as const;

export type TKey = keyof typeof dict["en"];

interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string; }
const I18nCtx = createContext<Ctx | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return ((localStorage.getItem(STORAGE_KEY) as Lang) ?? "en");
  });
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* noop */ }
  }, []);
  const t = useCallback((k: TKey) => (dict[lang] as Record<string, string>)[k] ?? (dict.en as Record<string, string>)[k] ?? k, [lang]);
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
};

export const useT = () => {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useT outside I18nProvider");
  return c;
};
