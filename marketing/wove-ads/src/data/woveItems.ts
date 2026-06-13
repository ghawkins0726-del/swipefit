export type AdItem = {
  id: string;
  title: string;
  brand: string;
  price: number;
  originalPrice?: number;
  condition: "new" | "like_new" | "good" | "fair";
  size: string;
  sellerName: string;
  styles: string[];
  /** Gradient used as a soft frame around the photo. */
  gradient: [string, string];
  /** Path relative to public assets (loaded via Remotion staticFile). */
  image: string;
  /** Tone for backdrop accents — e.g., the radial glow behind a featured card. */
  accent: string;
};

export const ITEMS: AdItem[] = [
  {
    id: "i-levis-501",
    title: "Vintage Denim Stack",
    brand: "Levi's",
    price: 32,
    originalPrice: 98,
    condition: "good",
    size: "M",
    sellerName: "@maya.thrifts",
    styles: ["vintage", "denim", "americana"],
    gradient: ["#2C3E50", "#0F1E2D"],
    image: "items/levis-501.jpg",
    accent: "#4A6FA5",
  },
  {
    id: "i-y2k-mesh",
    title: "Y2K Polka Mesh Top",
    brand: "Vintage No-Brand",
    price: 24,
    condition: "like_new",
    size: "S",
    sellerName: "@cherry.archive",
    styles: ["y2k", "going-out", "mesh"],
    gradient: ["#FF6B9D", "#C73E7C"],
    image: "items/y2k-mesh.jpg",
    accent: "#FFB3D1",
  },
  {
    id: "i-coach-bag",
    title: "Tan Leather Shoulder Bag",
    brand: "Coach",
    price: 68,
    originalPrice: 280,
    condition: "good",
    size: "—",
    sellerName: "@vintage.vault",
    styles: ["luxe", "minimal", "leather"],
    gradient: ["#8B6F47", "#3D2914"],
    image: "items/coach-bag.jpg",
    accent: "#D4A574",
  },
  {
    id: "i-cropped-tee",
    title: "Cotton Basics Trio",
    brand: "Brandy Melville",
    price: 14,
    condition: "good",
    size: "One Size",
    sellerName: "@softgirl.shop",
    styles: ["soft-girl", "y2k", "basics"],
    gradient: ["#FFB3BA", "#E89BA5"],
    image: "items/cropped-tee.jpg",
    accent: "#FFE4E1",
  },
  {
    id: "i-doc-martens",
    title: "Doc Martens 1460 · Black",
    brand: "Dr. Martens",
    price: 58,
    originalPrice: 170,
    condition: "good",
    size: "8",
    sellerName: "@grunge.club",
    styles: ["grunge", "edgy", "boots"],
    gradient: ["#1A1A1A", "#0A0A0A"],
    image: "items/doc-martens.jpg",
    accent: "#3E3E3E",
  },
  {
    id: "i-leather-jacket",
    title: "Cognac Leather Jacket",
    brand: "Vintage",
    price: 84,
    condition: "good",
    size: "L",
    sellerName: "@retro.rack",
    styles: ["vintage", "boho", "70s"],
    gradient: ["#9C6B3F", "#5A3D24"],
    image: "items/suede-jacket.jpg",
    accent: "#C99875",
  },
  {
    id: "i-pleated-skirt",
    title: "Pleated Mini Skirt",
    brand: "Reformation",
    price: 38,
    originalPrice: 128,
    condition: "like_new",
    size: "S",
    sellerName: "@matcha.closet",
    styles: ["preppy", "minimal", "soft"],
    gradient: ["#F5E6CA", "#D4B896"],
    image: "items/pleated-skirt.jpg",
    accent: "#FFFFFF",
  },
  {
    id: "i-cargo-pants",
    title: "Beige Cargo Shorts",
    brand: "Carhartt",
    price: 42,
    condition: "good",
    size: "M",
    sellerName: "@hugh.archive",
    styles: ["utility", "streetwear", "earth-tones"],
    gradient: ["#5A6347", "#2E3621"],
    image: "items/cargo-pants.jpg",
    accent: "#8B9469",
  },
];
