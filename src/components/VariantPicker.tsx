import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CartItem } from "@/hooks/useCart";

export interface VariantProduct {
  id: string; barcode: string; name: string; price: number; size: string | null; category?: string | null;
}

const CLOTH = ["cloth", "apparel", "fashion", "shirt", "garment", "wear"];
const WEIGHT = ["loose", "weight", "produce", "fruit", "vegetable", "grain", "dal", "rice"];
const has = (c: string | null | undefined, list: string[]) => !!c && list.some((k) => c.toLowerCase().includes(k));

export const kindOf = (c?: string | null): "cloth" | "weight" | null =>
  has(c, CLOTH) ? "cloth" : has(c, WEIGHT) ? "weight" : null;
export const needsVariant = (c?: string | null) => kindOf(c) !== null;

const SIZES = ["S", "M", "L", "XL", "XXL"];
// price for weight items is treated as per-kg
const WEIGHTS = [{ label: "250 g", kg: 0.25 }, { label: "500 g", kg: 0.5 }, { label: "1 kg", kg: 1 }, { label: "2 kg", kg: 2 }];

export const VariantPicker = ({ product, onClose, onPick }: {
  product: VariantProduct | null; onClose: () => void; onPick: (line: Omit<CartItem, "quantity">) => void;
}) => {
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => setSel(null), [product]);
  if (!product) return null;
  const kind = kindOf(product.category);
  const price = Number(product.price);

  const confirm = () => {
    if (!sel) return;
    if (kind === "cloth") {
      onPick({ product_id: product.id, barcode: product.barcode, name: product.name, price, size: sel, line_id: `${product.id}:${sel}` });
    } else {
      const w = WEIGHTS.find((x) => x.label === sel)!;
      onPick({ product_id: product.id, barcode: product.barcode, name: `${product.name} (${w.label})`,
        price: Math.round(price * w.kg * 100) / 100, size: w.label, line_id: `${product.id}:${w.label}` });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>{kind === "cloth" ? `Choose size • ₹${price.toFixed(2)}` : `Choose weight • ₹${price.toFixed(2)}/kg`}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {(kind === "cloth" ? SIZES : WEIGHTS.map((w) => w.label)).map((o) => (
            <Button key={o} variant={sel === o ? "default" : "outline"} className="tappable" onClick={() => setSel(o)}>{o}</Button>
          ))}
        </div>
        <Button className="w-full mt-2" disabled={!sel} onClick={confirm}>Add to cart</Button>
      </DialogContent>
    </Dialog>
  );
};
