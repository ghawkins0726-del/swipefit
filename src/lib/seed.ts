import { v4 as uuid } from 'uuid';
import { Item } from './types';

// Curated Unsplash photos by category
const IMGS = {
  tops: [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
    'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600',
    'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600',
    'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=600',
    'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600',
    'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600',
    'https://images.unsplash.com/photo-1617952385804-7b326fa42c30?w=600',
  ],
  bottoms: [
    'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600',
    'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=600',
    'https://images.unsplash.com/photo-1475178626620-a4d074967452?w=600',
    'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600',
  ],
  shoes: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600',
    'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600',
    'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600',
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600',
  ],
  outerwear: [
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600',
    'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600',
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600',
    'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600',
  ],
  accessories: [
    'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600',
    'https://images.unsplash.com/photo-1611923134239-b9be5816b23e?w=600',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600',
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600',
  ],
  dresses: [
    'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600',
    'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=600',
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600',
  ],
};

type SeedItem = Omit<Item, 'id' | 'createdAt'>;

const items: SeedItem[] = [
  // ─── STREETWEAR ──────────────────────────────────────────────────────────────
  { sellerId: 'u1', sellerName: 'Jordan K.', title: "Supreme Box Logo Crewneck FW22", description: 'Worn once. Shipped in original bag.', price: 285, images: [IMGS.tops[5]], category: 'tops', subcategory: 'crewneck', styles: ['streetwear', 'hypebeast', 'graphic'], colors: ['red'], size: 'L', brand: 'Supreme', condition: 'like_new', priceRange: 3, likes: 634, views: 4100, sold: false },
  { sellerId: 'u2', sellerName: 'Tyler B.', title: "Off-White Industrial Belt", description: 'SS19. Slight wear on buckle. Iconic.', price: 95, images: [IMGS.accessories[2]], category: 'accessories', subcategory: 'belts', styles: ['streetwear', 'luxury', 'avant garde'], colors: ['yellow', 'black'], size: 'one size', brand: 'Off-White', condition: 'good', priceRange: 2, likes: 412, views: 2340, sold: false },
  { sellerId: 'u3', sellerName: 'Sam W.', title: "Stüssy 8-Ball Crewneck", description: 'Heavy fleece, dropped shoulders.', price: 110, images: [IMGS.tops[6]], category: 'tops', subcategory: 'crewneck', styles: ['streetwear', 'skate', 'y2k'], colors: ['black'], size: 'L', brand: 'Stüssy', condition: 'like_new', priceRange: 2, likes: 305, views: 1870, sold: false },
  { sellerId: 'u4', sellerName: 'Devon C.', title: "Nike ACG Storm-FIT Jacket", description: 'Full zip, adjustable hem, chest pocket. Size M.', price: 145, images: [IMGS.outerwear[3]], category: 'outerwear', subcategory: 'jacket', styles: ['techwear', 'athletic', 'outdoor'], colors: ['black'], size: 'M', brand: 'Nike ACG', condition: 'like_new', priceRange: 2, likes: 278, views: 1640, sold: false },
  { sellerId: 'u5', sellerName: 'Alex T.', title: "Carhartt WIP Double Knee Pant", description: 'Duck canvas. Stone washed. Very durable.', price: 95, images: [IMGS.bottoms[1]], category: 'bottoms', subcategory: 'pants', styles: ['workwear', 'streetwear', 'utility'], colors: ['brown', 'tan'], size: 'W32 L30', brand: 'Carhartt WIP', condition: 'good', priceRange: 2, likes: 88, views: 542, sold: false },
  { sellerId: 'u6', sellerName: 'Marcus L.', title: "Corteiz Alcatraz Jacket", description: 'CRTZ drop, size XL. Hard to find.', price: 320, images: [IMGS.outerwear[0]], category: 'outerwear', subcategory: 'jacket', styles: ['streetwear', 'hypebeast'], colors: ['navy', 'blue'], size: 'XL', brand: 'Corteiz', condition: 'like_new', priceRange: 3, likes: 891, views: 5200, sold: false },

  // ─── MINIMAL / CLEAN ─────────────────────────────────────────────────────────
  { sellerId: 'u7', sellerName: 'Priya M.', title: "COS Oversized Linen Shirt", description: 'Relaxed fit, 100% linen, barely worn.', price: 48, images: [IMGS.tops[3]], category: 'tops', subcategory: 'shirts', styles: ['minimal', 'casual', 'clean'], colors: ['white', 'cream'], size: 'M', brand: 'COS', condition: 'like_new', priceRange: 1, likes: 134, views: 890, sold: false },
  { sellerId: 'u8', sellerName: 'Nia J.', title: "Toteme Scarf Coat", description: 'The iconic scarf-collar coat. Camel, size 36.', price: 480, images: [IMGS.outerwear[2]], category: 'outerwear', subcategory: 'coat', styles: ['minimal', 'luxury', 'elegant'], colors: ['camel', 'tan'], size: '36', brand: 'Toteme', condition: 'like_new', priceRange: 4, likes: 521, views: 3200, sold: false },
  { sellerId: 'u9', sellerName: 'Chloe H.', title: "Arket Merino Wool Polo", description: 'Fine knit, true to size. Navy.', price: 62, images: [IMGS.tops[1]], category: 'tops', subcategory: 'polo', styles: ['minimal', 'preppy', 'classic'], colors: ['navy', 'blue'], size: 'M', brand: 'Arket', condition: 'good', priceRange: 1, likes: 97, views: 590, sold: false },
  { sellerId: 'u10', sellerName: 'Maya R.', title: "Lemaire Straight Pants", description: 'Wool blend. Size 46. Perfect drape.', price: 220, images: [IMGS.bottoms[2]], category: 'bottoms', subcategory: 'pants', styles: ['minimal', 'luxury', 'editorial'], colors: ['beige', 'tan'], size: '46', brand: 'Lemaire', condition: 'good', priceRange: 3, likes: 302, views: 1780, sold: false },

  // ─── VINTAGE / ARCHIVE ───────────────────────────────────────────────────────
  { sellerId: 'u1', sellerName: 'Jordan K.', title: "Vintage Levi's 501 Jeans 32x30", description: "Classic straight-leg, perfect fade. '98 made.", price: 65, images: [IMGS.bottoms[0]], category: 'bottoms', subcategory: 'jeans', styles: ['vintage', 'casual', 'americana'], colors: ['blue', 'indigo'], size: '32x30', brand: "Levi's", condition: 'good', priceRange: 1, likes: 142, views: 890, sold: false },
  { sellerId: 'u11', sellerName: 'Reed H.', title: "Polo Ralph Lauren Oxford BNWT", description: 'Blue, size M. Never worn. Deadstock.', price: 35, images: [IMGS.tops[0]], category: 'tops', subcategory: 'shirts', styles: ['preppy', 'classic', 'americana'], colors: ['blue', 'light blue'], size: 'M', brand: 'Ralph Lauren', condition: 'new', priceRange: 0, likes: 56, views: 340, sold: false },
  { sellerId: 'u12', sellerName: 'Cam T.', title: "Vintage Harley-Davidson Tee XL", description: "Single stitch. Huntington Beach '94. OG.", price: 88, images: [IMGS.tops[4]], category: 'tops', subcategory: 't-shirts', styles: ['vintage', 'americana', 'graphic'], colors: ['black'], size: 'XL', brand: 'Harley-Davidson', condition: 'good', priceRange: 1, likes: 201, views: 1100, sold: false },
  { sellerId: 'u13', sellerName: 'Lea N.', title: "Agolde '90s Pinch Waist Jeans", description: 'High rise, straight leg. Dark indigo. Size 26.', price: 120, images: [IMGS.bottoms[3]], category: 'bottoms', subcategory: 'jeans', styles: ['vintage', 'minimal', '90s'], colors: ['blue', 'dark indigo'], size: '26', brand: 'Agolde', condition: 'like_new', priceRange: 2, likes: 183, views: 1040, sold: false },
  { sellerId: 'u14', sellerName: 'Sam W.', title: "Vintage Champion Reverse Weave S", description: 'Early 90s. No cracks. Script logo.', price: 110, images: [IMGS.tops[5]], category: 'tops', subcategory: 'sweatshirts', styles: ['vintage', 'americana', 'streetwear'], colors: ['grey'], size: 'S', brand: 'Champion', condition: 'good', priceRange: 2, likes: 267, views: 1580, sold: false },

  // ─── LUXURY / DESIGNER ───────────────────────────────────────────────────────
  { sellerId: 'u8', sellerName: 'Nia J.', title: "Maison Margiela Tabi Boots", description: 'Iconic split-toe. Some heel wear. Size 38.', price: 480, images: [IMGS.shoes[2]], category: 'shoes', subcategory: 'boots', styles: ['avant garde', 'luxury', 'editorial'], colors: ['black'], size: '38', brand: 'Maison Margiela', condition: 'fair', priceRange: 4, likes: 521, views: 3200, sold: false },
  { sellerId: 'u15', sellerName: 'Felix O.', title: "CDG Shirt x Lacoste Polo", description: 'Collab piece. Heart embroidered. Size M.', price: 95, images: [IMGS.tops[2]], category: 'tops', subcategory: 'polo', styles: ['preppy', 'streetwear', 'designer'], colors: ['white', 'red'], size: 'M', brand: 'Comme des Garçons', condition: 'like_new', priceRange: 2, likes: 447, views: 2700, sold: false },
  { sellerId: 'u16', sellerName: 'Mia F.', title: "Kapital Boro Ring Coat", description: 'Patchwork denim. Very unique. Size 2 (M-L).', price: 650, images: [IMGS.outerwear[1]], category: 'outerwear', subcategory: 'coat', styles: ['avant garde', 'japanese', 'artisanal', 'vintage'], colors: ['blue', 'multicolor'], size: '2', brand: 'Kapital', condition: 'good', priceRange: 4, likes: 367, views: 2200, sold: false },
  { sellerId: 'u17', sellerName: 'Omar K.', title: "Loro Piana Cashmere Sweater", description: 'Ivory. Size 50. Incredibly soft.', price: 395, images: [IMGS.tops[1]], category: 'tops', subcategory: 'knitwear', styles: ['luxury', 'minimal', 'classic'], colors: ['ivory', 'cream'], size: '50', brand: 'Loro Piana', condition: 'good', priceRange: 4, likes: 188, views: 1120, sold: false },

  // ─── SNEAKERS ────────────────────────────────────────────────────────────────
  { sellerId: 'u2', sellerName: 'Tyler B.', title: "New Balance 990v3 Grey USA", description: 'Made in USA. Size 11. Minor crease on toebox.', price: 175, images: [IMGS.shoes[0]], category: 'shoes', subcategory: 'sneakers', styles: ['dadcore', 'minimal', 'casual'], colors: ['grey'], size: '11', brand: 'New Balance', condition: 'good', priceRange: 3, likes: 167, views: 990, sold: false },
  { sellerId: 'u18', sellerName: 'Zoe P.', title: "Adidas Samba OG White Gum", description: 'Deadstock pair, size 9.5. Never worn.', price: 130, images: [IMGS.shoes[1]], category: 'shoes', subcategory: 'sneakers', styles: ['classic', 'minimal', 'casual'], colors: ['white', 'gum'], size: '9.5', brand: 'Adidas', condition: 'new', priceRange: 2, likes: 512, views: 3300, sold: false },
  { sellerId: 'u4', sellerName: 'Devon C.', title: "Nike Air Force 1 Low White 10", description: 'Lightly worn, clean. Size 10.', price: 85, images: [IMGS.shoes[3]], category: 'shoes', subcategory: 'sneakers', styles: ['streetwear', 'casual', 'minimal'], colors: ['white'], size: '10', brand: 'Nike', condition: 'like_new', priceRange: 2, likes: 213, views: 1250, sold: false },
  { sellerId: 'u19', sellerName: 'Jess R.', title: "Salomon XT-6 Black/Phantom", description: 'Gorpcore icon. Size 10.5. One season of use.', price: 155, images: [IMGS.shoes[4]], category: 'shoes', subcategory: 'trail runners', styles: ['techwear', 'outdoor', 'gorpcore'], colors: ['black', 'grey'], size: '10.5', brand: 'Salomon', condition: 'good', priceRange: 2, likes: 384, views: 2200, sold: false },
  { sellerId: 'u20', sellerName: 'Ben A.', title: "Jordan 1 Retro High OG Chicago", description: 'DS. Size 10. 2022 release.', price: 380, images: [IMGS.shoes[2]], category: 'shoes', subcategory: 'sneakers', styles: ['streetwear', 'hypebeast'], colors: ['red', 'white', 'black'], size: '10', brand: 'Jordan', condition: 'new', priceRange: 3, likes: 720, views: 4800, sold: false },
  { sellerId: 'u21', sellerName: 'Kai W.', title: "Asics Gel-Kayano 14 Cream/Sage", description: 'The Pinterest sneaker. Size 9.', price: 140, images: [IMGS.shoes[0]], category: 'shoes', subcategory: 'sneakers', styles: ['y2k', 'minimal', 'preppy'], colors: ['cream', 'sage'], size: '9', brand: 'Asics', condition: 'like_new', priceRange: 2, likes: 445, views: 2780, sold: false },

  // ─── OUTERWEAR ───────────────────────────────────────────────────────────────
  { sellerId: 'u9', sellerName: 'Chloe H.', title: "Vintage Leather Moto Jacket M", description: 'Real leather, asymmetric zip. Buttery soft.', price: 220, images: [IMGS.outerwear[0]], category: 'outerwear', subcategory: 'jacket', styles: ['moto', 'vintage', 'edgy'], colors: ['black'], size: 'M', brand: 'Unknown', condition: 'good', priceRange: 3, likes: 412, views: 2340, sold: false },
  { sellerId: 'u22', sellerName: 'Ari S.', title: "Arc'teryx Beta LT Neptune M", description: 'Gore-Tex, barely used. Neptune blue.', price: 380, images: [IMGS.outerwear[2]], category: 'outerwear', subcategory: 'shell jacket', styles: ['techwear', 'outdoor', 'minimal'], colors: ['blue', 'navy'], size: 'M', brand: "Arc'teryx", condition: 'like_new', priceRange: 4, likes: 298, views: 1780, sold: false },
  { sellerId: 'u23', sellerName: 'Dana K.', title: "Patagonia Fleece Synchilla Snap-T", description: 'Classic snap-T in teal. Cozy and clean.', price: 68, images: [IMGS.outerwear[3]], category: 'outerwear', subcategory: 'fleece', styles: ['outdoor', 'casual', 'americana', 'gorpcore'], colors: ['teal', 'green'], size: 'M', brand: 'Patagonia', condition: 'good', priceRange: 1, likes: 201, views: 1220, sold: false },
  { sellerId: 'u24', sellerName: 'Leo B.', title: "Stone Island Garment-Dyed Overshirt", description: 'Compass badge, khaki, size L.', price: 280, images: [IMGS.outerwear[1]], category: 'outerwear', subcategory: 'overshirt', styles: ['streetwear', 'luxury', 'workwear'], colors: ['khaki', 'olive'], size: 'L', brand: 'Stone Island', condition: 'good', priceRange: 3, likes: 334, views: 2010, sold: false },
  { sellerId: 'u25', sellerName: 'Iris M.', title: "Barbour Beaufort Wax Jacket", description: 'Classic Barbour. Re-waxed. Very classic.', price: 145, images: [IMGS.outerwear[0]], category: 'outerwear', subcategory: 'jacket', styles: ['preppy', 'classic', 'outdoor'], colors: ['olive', 'green'], size: 'M', brand: 'Barbour', condition: 'good', priceRange: 2, likes: 112, views: 680, sold: false },

  // ─── DRESSES ─────────────────────────────────────────────────────────────────
  { sellerId: 'u7', sellerName: 'Priya M.', title: "Silk Slip Dress Forest Green S", description: 'Minimal, bias cut, adjustable straps.', price: 78, images: [IMGS.dresses[0]], category: 'dresses', subcategory: 'slip dress', styles: ['minimal', 'elegant', 'y2k'], colors: ['green'], size: 'S', brand: 'Zara', condition: 'like_new', priceRange: 1, likes: 224, views: 1100, sold: false },
  { sellerId: 'u26', sellerName: 'Tara O.', title: "Floral Maxi Dress Boho M", description: 'Flowy, elastic waist, v-neck. Summer perfect.', price: 48, images: [IMGS.dresses[1]], category: 'dresses', subcategory: 'maxi dress', styles: ['bohemian', 'floral', 'casual'], colors: ['multicolor', 'pink'], size: 'M', brand: 'Free People', condition: 'good', priceRange: 0, likes: 128, views: 780, sold: false },
  { sellerId: 'u27', sellerName: 'Nora C.', title: "Reformation Linen Mini Dress", description: 'Butter yellow, linen. Size 2.', price: 95, images: [IMGS.dresses[2]], category: 'dresses', subcategory: 'mini dress', styles: ['minimal', 'casual', 'elegant'], colors: ['yellow'], size: '2', brand: 'Reformation', condition: 'like_new', priceRange: 2, likes: 278, views: 1540, sold: false },
  { sellerId: 'u28', sellerName: 'Kim A.', title: "Caro Editions Smocked Sundress", description: 'Hand-embroidered, ethical production.', price: 125, images: [IMGS.dresses[0]], category: 'dresses', subcategory: 'sundress', styles: ['bohemian', 'artisanal', 'elegant'], colors: ['white', 'cream'], size: 'M', brand: 'Caro Editions', condition: 'new', priceRange: 2, likes: 189, views: 1020, sold: false },

  // ─── ACCESSORIES ─────────────────────────────────────────────────────────────
  { sellerId: 'u26', sellerName: 'Tara O.', title: "Vintage Coach Saddle Bag", description: 'Full-grain leather, Old Coach quality.', price: 165, images: [IMGS.accessories[1]], category: 'accessories', subcategory: 'bags', styles: ['preppy', 'vintage', 'classic'], colors: ['tan', 'brown'], size: 'one size', brand: 'Coach', condition: 'good', priceRange: 3, likes: 277, views: 1560, sold: false },
  { sellerId: 'u29', sellerName: 'Sol B.', title: "Gold Layering Necklace Set", description: '18k gold plated. Three lengths. Never tarnished.', price: 42, images: [IMGS.accessories[0]], category: 'accessories', subcategory: 'jewelry', styles: ['minimal', 'elegant', 'bohemian'], colors: ['gold'], size: 'one size', brand: 'Mejuri dupe', condition: 'new', priceRange: 0, likes: 389, views: 2100, sold: false },
  { sellerId: 'u30', sellerName: 'Evan P.', title: "Seiko Submariner Mod — Sapphire", description: 'NH35 movement, AR coated sapphire. Runs accurate.', price: 280, images: [IMGS.accessories[2]], category: 'accessories', subcategory: 'watches', styles: ['luxury', 'classic', 'minimal'], colors: ['black', 'silver'], size: 'one size', brand: 'Seiko Mod', condition: 'like_new', priceRange: 3, likes: 193, views: 1140, sold: false },
  { sellerId: 'u31', sellerName: 'Vera L.', title: "Prada Re-Edition 2005 Bag", description: 'Re-nylon, barely used. Authenticity card incl.', price: 650, images: [IMGS.accessories[3]], category: 'accessories', subcategory: 'bags', styles: ['luxury', 'y2k', 'minimal'], colors: ['black'], size: 'one size', brand: 'Prada', condition: 'like_new', priceRange: 4, likes: 812, views: 5100, sold: false },
  { sellerId: 'u32', sellerName: 'Jake N.', title: "New Era 59FIFTY Fitted Hat 7 3/8", description: 'Chicago Bulls, OG colorway. Flat brim, no sticker.', price: 35, images: [IMGS.accessories[0]], category: 'accessories', subcategory: 'hats', styles: ['streetwear', 'classic', 'americana'], colors: ['black', 'red'], size: '7 3/8', brand: 'New Era', condition: 'good', priceRange: 0, likes: 98, views: 560, sold: false },

  // ─── MORE TOPS ───────────────────────────────────────────────────────────────
  { sellerId: 'u33', sellerName: 'Pat O.', title: "Needles Rebuild Flannel Shirt", description: 'Patchwork flannel rebuild. One of a kind.', price: 195, images: [IMGS.tops[3]], category: 'tops', subcategory: 'shirts', styles: ['japanese', 'vintage', 'artisanal'], colors: ['multicolor'], size: 'M/L', brand: 'Needles', condition: 'good', priceRange: 3, likes: 344, views: 2100, sold: false },
  { sellerId: 'u34', sellerName: 'Quinn A.', title: "Hanes Beefy Tee 3-Pack M (NWT)", description: 'The perfect blank tee. Still in bag.', price: 22, images: [IMGS.tops[0]], category: 'tops', subcategory: 't-shirts', styles: ['minimal', 'casual', 'workwear'], colors: ['white'], size: 'M', brand: 'Hanes', condition: 'new', priceRange: 0, likes: 67, views: 410, sold: false },
  { sellerId: 'u35', sellerName: 'Maya R.', title: "Acne Studios Face Logo Hoodie", description: 'Dusty pink, size S. Barely worn.', price: 185, images: [IMGS.tops[2]], category: 'tops', subcategory: 'hoodies', styles: ['minimal', 'luxury', 'streetwear'], colors: ['pink', 'dusty rose'], size: 'S', brand: 'Acne Studios', condition: 'like_new', priceRange: 3, likes: 301, views: 1890, sold: false },
  { sellerId: 'u36', sellerName: 'Rob S.', title: "Polo Ralph Lauren RLPC Tee", description: 'Vintage washed, pony chest. Size L.', price: 28, images: [IMGS.tops[4]], category: 'tops', subcategory: 't-shirts', styles: ['preppy', 'casual', 'classic'], colors: ['navy'], size: 'L', brand: 'Ralph Lauren', condition: 'good', priceRange: 0, likes: 78, views: 490, sold: false },
  { sellerId: 'u37', sellerName: 'Lily C.', title: "Issey Miyake Pleats Please Top", description: 'Permanent pleat, machine washable. One size.', price: 145, images: [IMGS.tops[1]], category: 'tops', subcategory: 'tops', styles: ['avant garde', 'japanese', 'minimal'], colors: ['black'], size: 'one size', brand: 'Issey Miyake', condition: 'good', priceRange: 2, likes: 234, views: 1380, sold: false },

  // ─── MORE BOTTOMS ─────────────────────────────────────────────────────────────
  { sellerId: 'u38', sellerName: 'Tim B.', title: "Dickies 874 Work Pant Black 32x32", description: 'The workwear classic. Never shrinks.', price: 30, images: [IMGS.bottoms[2]], category: 'bottoms', subcategory: 'pants', styles: ['workwear', 'streetwear', 'casual'], colors: ['black'], size: '32x32', brand: 'Dickies', condition: 'good', priceRange: 0, likes: 112, views: 670, sold: false },
  { sellerId: 'u39', sellerName: 'Jo H.', title: "Loro Piana Tasche Trousers", description: 'Wool, size 48. Very refined.', price: 340, images: [IMGS.bottoms[1]], category: 'bottoms', subcategory: 'trousers', styles: ['luxury', 'minimal', 'classic'], colors: ['charcoal'], size: '48', brand: 'Loro Piana', condition: 'like_new', priceRange: 4, likes: 145, views: 880, sold: false },
  { sellerId: 'u40', sellerName: 'Wren A.', title: "Dockers Alpha Khaki Slim 32x30", description: 'Khaki chinos. Classic fit, slim cut.', price: 28, images: [IMGS.bottoms[3]], category: 'bottoms', subcategory: 'chinos', styles: ['preppy', 'casual', 'classic'], colors: ['khaki'], size: '32x30', brand: 'Dockers', condition: 'good', priceRange: 0, likes: 44, views: 280, sold: false },

  // ─── MORE SHOES ──────────────────────────────────────────────────────────────
  { sellerId: 'u41', sellerName: 'Blake M.', title: "Birkenstock Arizona Suede Taupe", description: 'EU 43. Broken in perfectly.', price: 75, images: [IMGS.shoes[1]], category: 'shoes', subcategory: 'sandals', styles: ['casual', 'minimal', 'bohemian'], colors: ['taupe', 'brown'], size: 'EU 43', brand: 'Birkenstock', condition: 'good', priceRange: 1, likes: 167, views: 990, sold: false },
  { sellerId: 'u42', sellerName: 'Finn K.', title: "Vans Old Skool Black/White 10", description: 'The OG. Barely worn. Size 10.', price: 45, images: [IMGS.shoes[4]], category: 'shoes', subcategory: 'sneakers', styles: ['skate', 'casual', 'streetwear'], colors: ['black', 'white'], size: '10', brand: 'Vans', condition: 'like_new', priceRange: 0, likes: 98, views: 580, sold: false },
  { sellerId: 'u43', sellerName: 'Dani R.', title: "Dr. Martens 1460 Cherry Red 8", description: 'Classic 8-eye boot. Cherry red. Size 8.', price: 120, images: [IMGS.shoes[3]], category: 'shoes', subcategory: 'boots', styles: ['vintage', 'edgy', 'classic'], colors: ['red', 'cherry'], size: '8', brand: 'Dr. Martens', condition: 'good', priceRange: 2, likes: 189, views: 1120, sold: false },
];

export function getSeedItems(): Item[] {
  const now = Date.now();
  return items.map((data, i) => ({
    ...data,
    id: uuid(),
    createdAt: now - i * 2400000, // stagger over ~80 hours
  }));
}
