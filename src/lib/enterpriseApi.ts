// Mock Enterprise Retail API Gateway (simulates SAP / Oracle Retail endpoints).
// In production these would be authenticated REST calls to the store's ERP.
// Here we simulate deterministic responses with latency for realistic UX.

export interface StoreBranch {
  id: string;
  name: string;
  city: string;
  region: string;
  gstin: string;
}

export interface LiveInventory {
  barcode: string;
  branch_id: string;
  on_hand: number;
  reserved: number;
  reorder_level: number;
  last_synced: string;
}

export interface Campaign {
  id: string;
  branch_id: string;
  title: string;
  category?: string;
  discount_pct: number;
  starts_at: string;
  ends_at: string;
  code?: string;
}

export const STORE_BRANCHES: StoreBranch[] = [
  { id: "VMM-DEL-001", name: "Vishal Mega Mart — Rohini", city: "Delhi", region: "North", gstin: "07AABCV1234N1Z5" },
  { id: "VMM-MUM-014", name: "Vishal Mega Mart — Andheri West", city: "Mumbai", region: "West", gstin: "27AABCV1234N1Z2" },
  { id: "GCM-PUN-002", name: "Ganesh Capmart — FC Road", city: "Pune", region: "West", gstin: "27AAGCG9876P1ZQ" },
  { id: "DMT-BLR-021", name: "DMart — Whitefield", city: "Bengaluru", region: "South", gstin: "29AAACD5555L1Z9" },
];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const seededRand = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (Math.abs(h) % 1000) / 1000;
};

/** GET /v1/branches — list configured retail branches. */
export const fetchBranches = async (): Promise<StoreBranch[]> => {
  await delay(120);
  return STORE_BRANCHES;
};

/** GET /v1/inventory?branch=…&barcode=… — live on-hand quantity from ERP. */
export const fetchLiveInventory = async (
  barcode: string,
  branch_id: string
): Promise<LiveInventory> => {
  await delay(180);
  const base = Math.floor(seededRand(`${branch_id}:${barcode}`) * 220);
  return {
    barcode,
    branch_id,
    on_hand: base,
    reserved: Math.max(0, Math.floor(base * 0.08)),
    reorder_level: 15,
    last_synced: new Date().toISOString(),
  };
};

/** GET /v1/campaigns?branch=… — active discount campaigns for a branch. */
export const fetchActiveCampaigns = async (branch_id: string): Promise<Campaign[]> => {
  await delay(160);
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [
    {
      id: `${branch_id}-GROC-10`,
      branch_id,
      title: "Grocery Bonanza — Flat 10% off",
      category: "Grocery",
      discount_pct: 10,
      starts_at: new Date(now - day).toISOString(),
      ends_at: new Date(now + 6 * day).toISOString(),
      code: "GROC10",
    },
    {
      id: `${branch_id}-CLTH-20`,
      branch_id,
      title: "Fashion Fest — Up to 20% off Clothing",
      category: "Clothing",
      discount_pct: 20,
      starts_at: new Date(now - 2 * day).toISOString(),
      ends_at: new Date(now + 10 * day).toISOString(),
      code: "STYLE20",
    },
    {
      id: `${branch_id}-ELEC-5`,
      branch_id,
      title: "Electronics Weekend — 5% instant off",
      category: "Electronics",
      discount_pct: 5,
      starts_at: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
      ends_at: new Date(now + 2 * day).toISOString(),
    },
  ];
};

const BRANCH_KEY = "scango.branch";
export const getCurrentBranchId = (): string =>
  localStorage.getItem(BRANCH_KEY) ?? STORE_BRANCHES[0].id;
export const setCurrentBranchId = (id: string) => localStorage.setItem(BRANCH_KEY, id);
