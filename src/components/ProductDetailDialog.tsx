import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Shirt, Apple, Package, Plus, Minus } from "lucide-react";
import type { CachedProduct } from "@/lib/db";

export interface ProductDetail extends CachedProduct {
  category?: string | null;
  sub_category?: string | null;
  mrp?: number | null;
  discount_price?: number | null;
  tax_rate_gst?: number | null;
  variants?: { sizes?: string[]; colors?: string[]; weights?: string[] } | null;
}

interface Props {
  product: ProductDetail | null;
  onClose: () => void;
  onConfirm: (opts: { size: string | null; quantity: number }) => void;
}

const DEFAULT_SIZES = ["S", "M", "L", "XL"];
const DEFAULT_COLORS = ["Black", "Blue", "White"];
const DEFAULT_WEIGHTS = ["250g", "500g", "1kg"];

export const ProductDetailDialog = ({ product, onClose, onConfirm }: Props) => {
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [weight, setWeight] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!product) return;
    const cat = (product.category ?? "").toLowerCase();
    const v = product.variants ?? {};
    if (cat === "clothing") {
      setSize((v.sizes ?? DEFAULT_SIZES)[1] ?? null);
      setColor((v.colors ?? DEFAULT_COLORS)[0] ?? null);
      setWeight(null);
    } else if (cat === "grocery") {
      setWeight((v.weights ?? DEFAULT_WEIGHTS)[1] ?? null);
      setSize(null); setColor(null);
    } else {
      setSize(product.size); setColor(null); setWeight(null);
    }
    setQty(1);
  }, [product]);

  if (!product) return null;
  const cat = (product.category ?? "").toLowerCase();
  const isClothing = cat === "clothing";
  const isGrocery = cat === "grocery";
  const v = product.variants ?? {};
  const price = Number(product.discount_price ?? product.price);
  const mrp = product.mrp ? Number(product.mrp) : null;
  const gst = Number(product.tax_rate_gst ?? 0);

  const Icon = isClothing ? Shirt : isGrocery ? Apple : Package;

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-emerald" /> {product.name}
          </DialogTitle>
          <DialogDescription>
            {product.category ? <Badge variant="secondary" className="mr-2">{product.category}</Badge> : null}
            {product.sub_category && <span className="text-xs text-muted-foreground">{product.sub_category}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-4">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-24 w-24 rounded-xl object-cover border border-white/10" />
          ) : (
            <div className="h-24 w-24 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 grid place-items-center">
              <Icon className="h-8 w-8 text-primary-foreground/70" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">₹{price.toFixed(2)}</p>
              {mrp && mrp > price && <p className="text-sm text-muted-foreground line-through">₹{mrp.toFixed(2)}</p>}
            </div>
            {gst > 0 && <p className="text-[11px] text-muted-foreground">incl. {gst}% GST</p>}
            <p className="text-xs text-muted-foreground mt-1">In stock: {product.stock ?? 0}</p>
          </div>
        </div>

        {isClothing && (
          <div className="space-y-3 mt-2">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Size</p>
              <div className="flex flex-wrap gap-2">
                {(v.sizes ?? DEFAULT_SIZES).map((s) => (
                  <button key={s} onClick={() => setSize(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm tappable border ${size === s ? "bg-primary text-primary-foreground border-primary shadow-glow" : "glass border-white/10"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {(v.colors ?? DEFAULT_COLORS).map((c) => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`px-3 py-1.5 rounded-lg text-sm tappable border ${color === c ? "bg-accent text-accent-foreground border-accent" : "glass border-white/10"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isGrocery && (
          <div className="mt-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Weight / Pack</p>
            <div className="flex flex-wrap gap-2">
              {(v.weights ?? DEFAULT_WEIGHTS).map((w) => (
                <button key={w} onClick={() => setWeight(w)}
                  className={`px-3 py-1.5 rounded-lg text-sm tappable border ${weight === w ? "bg-primary text-primary-foreground border-primary shadow-glow" : "glass border-white/10"}`}>
                  {w}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Quantity</p>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="h-8 w-8 tappable" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus className="h-3 w-3" /></Button>
            <span className="w-8 text-center font-semibold">{qty}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8 tappable" onClick={() => setQty((q) => q + 1)}><Plus className="h-3 w-3" /></Button>
          </div>
        </div>

        <Button
          className="w-full gradient-primary text-primary-foreground border-0 shadow-elegant tappable font-semibold mt-2"
          onClick={() => {
            const parts = [size, color, weight].filter(Boolean);
            onConfirm({ size: parts.length ? parts.join(" · ") : product.size, quantity: qty });
          }}
        >
          <ShoppingBag className="h-4 w-4 mr-2" /> Add {qty} to Cart · ₹{(price * qty).toFixed(2)}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
