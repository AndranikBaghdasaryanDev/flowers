/**
 * Seeds store settings, delivery methods and an ILLUSTRATIVE SAMPLE catalogue.
 *
 *   npm run seed            → settings + delivery methods only (safe for production)
 *   npm run seed -- --demo  → also sample categories, products, gallery and homepage imagery
 *
 * Every sample record is flagged `isSample: true`. The storefront labels sample products,
 * and the admin setup checklist asks the owner to replace them. Sample prices and fees are
 * placeholders, NOT official Floriani prices. Photos are from Unsplash (see scripts/seed-assets/CREDITS.json).
 * The script is idempotent: existing records (matched by slug/name) are left untouched.
 */
import "./load-env";
import mongoose from "mongoose";
import { readFileSync } from "node:fs";
import path from "node:path";
import { connectDb } from "@/lib/db";
import { Category, Media, Product } from "@/lib/models/catalog";
import { DeliveryMethod } from "@/lib/models/delivery";
import { GalleryItem, Settings } from "@/lib/models/content";
import { storeImage } from "@/lib/services/media";

const DEMO = process.argv.includes("--demo");
const ASSETS = path.resolve(process.cwd(), "scripts/seed-assets");

const YEREVAN_DISTRICTS = [
  "Ajapnyak", "Arabkir", "Avan", "Davtashen", "Erebuni", "Kanaker-Zeytun",
  "Kentron", "Malatia-Sebastia", "Nor Nork", "Nork-Marash", "Nubarashen", "Shengavit",
];

const imageCache = new Map<string, string>();
async function image(file: string, alt: string, purpose: "product" | "category" | "content" | "gallery") {
  if (imageCache.has(file)) return imageCache.get(file)!;
  const existing = await Media.findOne({ filename: file.replace(/\.[^.]+$/, ".webp"), isSample: true }).lean();
  if (existing) {
    imageCache.set(file, String(existing._id));
    return String(existing._id);
  }
  const buffer = readFileSync(path.join(ASSETS, file));
  const stored = await storeImage(buffer, { filename: file, purpose, alt, isSample: true });
  imageCache.set(file, stored.id);
  return stored.id;
}

const LEGAL_TEMPLATE_NOTICE =
  "This page is a starting template prepared for Floriani Flowers. It must be reviewed and adapted by the business before launch.";

async function seedSettings() {
  await Settings.updateOne(
    { _id: "store" },
    {
      $setOnInsert: {
        _id: "store",
        storeName: "Floriani Flowers",
        currency: "AMD",
        timeZone: "Asia/Yerevan",
        "social.instagram": "https://www.instagram.com/floriani.flowers/",
        "legal.privacy": `${LEGAL_TEMPLATE_NOTICE}\n\nWhat we collect\nWhen you place an order we collect your name, phone number, email address and, for deliveries, the delivery address and recipient details. If you create an account we also store your saved addresses and order history.\n\nWhy we collect it\nWe use this information only to prepare, deliver and support your order, to contact you about it, and — if you opt in — to send occasional news.\n\nSharing\nDelivery details are shared only with the courier carrying your order. We do not sell personal data.\n\nYour rights\nYou can ask us to access, correct or delete your personal data by contacting us.`,
        "legal.terms": `${LEGAL_TEMPLATE_NOTICE}\n\nOrders\nAn order is accepted once we confirm it. We may contact you if an item or delivery slot becomes unavailable.\n\nNatural products\nFlowers are natural products. Individual stems may vary slightly in colour, size and shape from the photographs; if a particular flower is unavailable we may replace it with one of similar style and equal or greater value.\n\nPayment\nPayment is collected on delivery or at pickup, as selected at checkout.\n\nDelivery\nPlease make sure the recipient is available at the chosen address and time window.`,
        "legal.returns": `${LEGAL_TEMPLATE_NOTICE}\n\nCancellation\nYou can cancel your order online while it is still awaiting confirmation. After confirmation, please contact us as soon as possible.\n\nQuality concerns\nIf your flowers arrive damaged or not as described, please contact us within 24 hours of delivery with a photo so we can make it right.`,
      },
    },
    { upsert: true },
  );
  console.log("✓ store settings");
}

async function seedDeliveryMethods() {
  if (await DeliveryMethod.exists({})) {
    console.log("• delivery methods already exist — skipped");
    return;
  }
  await DeliveryMethod.create([
    {
      name: "Courier delivery in Yerevan",
      type: "delivery",
      description: "Hand delivery by our courier to the address of your choice in Yerevan.",
      isActive: true,
      fee: 1500, // SAMPLE fee — review in Admin → Delivery → Settings
      city: "Yerevan",
      zones: YEREVAN_DISTRICTS.map((name) => ({ name, fee: null })),
      estimatedTime: "",
      leadTimeMinutes: 180,
      maxDaysAhead: 30,
      availableWeekdays: [0, 1, 2, 3, 4, 5, 6],
      timeWindows: [
        { label: "10:00 – 13:00", start: "10:00", end: "13:00" },
        { label: "13:00 – 16:00", start: "13:00", end: "16:00" },
        { label: "16:00 – 19:00", start: "16:00", end: "19:00" },
        { label: "19:00 – 21:00", start: "19:00", end: "21:00" },
      ],
      requiresCourier: true,
      sortOrder: 0,
    },
    {
      name: "Pickup from the studio",
      type: "pickup",
      description: "Collect your order yourself. We will confirm the pickup address when we confirm your order.",
      isActive: true,
      fee: 0,
      leadTimeMinutes: 120,
      maxDaysAhead: 30,
      availableWeekdays: [0, 1, 2, 3, 4, 5, 6],
      timeWindows: [
        { label: "11:00 – 14:00", start: "11:00", end: "14:00" },
        { label: "14:00 – 17:00", start: "14:00", end: "17:00" },
        { label: "17:00 – 20:00", start: "17:00", end: "20:00" },
      ],
      requiresCourier: false,
      pickupAddress: "",
      sortOrder: 1,
    },
  ]);
  console.log("✓ delivery methods (sample fees — review before launch)");
}

type SeedCategory = { slug: string; name: string; kind: "collection" | "occasion"; description: string; image: string; alt: string; featured?: boolean };

const CATEGORIES: SeedCategory[] = [
  { slug: "bouquets", name: "Bouquets", kind: "collection", featured: true, image: "hero-bouquet.webp", alt: "A lush mixed bouquet of roses and astrantia", description: "Hand-tied bouquets composed stem by stem, wrapped to be given." },
  { slug: "roses", name: "Roses", kind: "collection", featured: true, image: "cat-roses.webp", alt: "Red and blush roses close together", description: "The language of roses — from a single bloom to a generous armful." },
  { slug: "compositions", name: "Compositions", kind: "collection", featured: true, image: "dusty-rose.webp", alt: "A soft composition of mauve roses and lisianthus", description: "Arranged pieces in boxes, baskets and vessels, ready to display." },
  { slug: "flower-boxes", name: "Flower boxes", kind: "collection", featured: true, image: "hatbox-pastel-1.webp", alt: "Pastel flowers arranged in a round pink hatbox", description: "Blooms arranged in elegant boxes — no vase needed." },
  { slug: "indoor-plants", name: "Indoor plants", kind: "collection", featured: true, image: "cat-plants.webp", alt: "A group of green indoor plants in pots", description: "Orchids and green companions that last well beyond the moment." },
  { slug: "wedding-events", name: "Wedding & events", kind: "collection", featured: true, image: "bridal-bouquet.webp", alt: "A bride holding a red and pink bouquet", description: "Bridal bouquets and floral styling for celebrations." },
  { slug: "birthday", name: "Birthday", kind: "occasion", image: "occ-birthday.webp", alt: "A colourful arrangement in a wooden box", description: "Bright, joyful flowers for another trip around the sun." },
  { slug: "anniversary", name: "Anniversary", kind: "occasion", image: "occ-anniversary.webp", alt: "Deep red roses on a red background", description: "For the years shared and the ones still to come." },
  { slug: "love-romance", name: "Love & romance", kind: "occasion", image: "occ-romantic.webp", alt: "A dense cluster of crimson roses", description: "Say it with roses — tender, timeless, unmistakable." },
  { slug: "congratulations", name: "Congratulations", kind: "occasion", image: "occ-congrats.webp", alt: "A vibrant still-life arrangement in a white jug", description: "Celebrate milestones, new beginnings and big news." },
  { slug: "thank-you", name: "Thank you", kind: "occasion", image: "occ-thanks.webp", alt: "Peach carnations and white stock flowers", description: "Gratitude, beautifully expressed." },
];

type SeedProduct = {
  slug: string;
  name: string;
  category: string;
  occasions: string[];
  price: number;
  compareAtPrice?: number;
  images: [string, string][];
  short: string;
  description: string;
  composition: string[];
  colors: string[];
  sizeLabel?: string;
  dimensions?: string;
  featured?: boolean;
  trackInventory?: boolean;
  stock?: number;
};

const CARE = "Trim the stems at an angle and place them in fresh, cool water. Change the water every two days and keep the flowers away from direct sun, heat and ripening fruit.";

const PRODUCTS: SeedProduct[] = [
  { slug: "velvet-burgundy-roses", name: "Velvet Burgundy Roses", category: "roses", occasions: ["love-romance", "anniversary"], price: 32000, images: [["velvet-roses-1.webp", "A generous bunch of deep red roses on white"], ["velvet-roses-2.webp", "Close-up of a velvety red rose"]], short: "Deep, velvety roses gathered into a statement bouquet.", description: "A classic declaration in the richest shade of red. Long-stemmed roses are gathered by hand and finished with a refined wrap that lets the colour speak for itself.", composition: ["Red roses"], colors: ["Burgundy", "Red"], sizeLabel: "Medium", dimensions: "Approx. 45 cm tall", featured: true },
  { slug: "blush-peony-bouquet", name: "Blush Peony Bouquet", category: "bouquets", occasions: ["birthday", "thank-you"], price: 38000, images: [["blush-peony-1.webp", "Soft pink peonies in a glass vase"], ["blush-peony-2.webp", "Pink peonies with green leaves on white"]], short: "Cloud-soft peonies in tender shades of blush.", description: "Generous, romantic and full of movement — peonies open day by day into soft, layered blooms. A bouquet that feels like a celebration of spring.", composition: ["Peonies", "Seasonal greenery"], colors: ["Blush", "Pink"], sizeLabel: "Medium", featured: true },
  { slug: "garden-romance", name: "Garden Romance", category: "bouquets", occasions: ["love-romance", "birthday"], price: 29000, images: [["garden-romance.webp", "Pink roses wrapped in white paper with small accents"]], short: "Pink roses and delicate accents in airy white wrapping.", description: "A light, joyful bouquet of pink roses with delicate filler flowers, wrapped in soft white paper. Effortlessly romantic.", composition: ["Pink roses", "Spray flowers", "Seasonal accents"], colors: ["Pink", "White"], sizeLabel: "Medium" },
  { slug: "ivory-whisper", name: "Ivory Whisper", category: "bouquets", occasions: ["thank-you", "congratulations"], price: 27000, images: [["ivory-whisper.webp", "A bouquet of white roses and hydrangea in kraft paper"]], short: "Creamy whites in natural kraft — quiet and elegant.", description: "White roses, hydrangea and soft greenery wrapped in natural kraft paper. Understated, calm and endlessly elegant.", composition: ["White roses", "Hydrangea", "Greenery"], colors: ["White", "Ivory", "Green"], sizeLabel: "Medium" },
  { slug: "pastel-hatbox", name: "Pastel Hatbox", category: "flower-boxes", occasions: ["birthday", "anniversary"], price: 45000, images: [["hatbox-pastel-1.webp", "Pastel roses and chrysanthemums in a round pink hatbox"], ["hatbox-pastel-2.webp", "Detail of pastel flowers in a pink hatbox"]], short: "Garden roses and soft chrysanthemums in a round hatbox.", description: "A ready-to-display composition in a round hatbox: peach garden roses, pastel chrysanthemums and delicate accents. No vase required.", composition: ["Garden roses", "Chrysanthemums", "Seasonal accents"], colors: ["Peach", "Pink", "Cream"], sizeLabel: "Large", featured: true },
  { slug: "red-roses-box", name: "Red Roses in a Gift Box", category: "flower-boxes", occasions: ["love-romance", "anniversary"], price: 42000, images: [["red-roses-box.webp", "Deep red roses and gypsophila in a white gift box with red ribbon"]], short: "Deep red roses with gypsophila in a ribboned gift box.", description: "A gift that arrives ready to impress: deep red roses with clouds of gypsophila, presented in a white box tied with ribbon.", composition: ["Red roses", "Gypsophila"], colors: ["Red", "White"], sizeLabel: "Medium" },
  { slug: "wildflower-kraft", name: "Wildflower Kraft Bouquet", category: "bouquets", occasions: ["thank-you", "birthday"], price: 19000, images: [["wildflower-kraft.webp", "A wild-style bouquet with a sunflower in kraft paper"]], short: "A relaxed, just-picked bouquet with a sunny heart.", description: "Loose, natural and cheerful — a garden-style bouquet with a single sunflower at its heart, wrapped in kraft paper.", composition: ["Sunflower", "Wildflowers", "Greenery"], colors: ["Yellow", "Green"], sizeLabel: "Small" },
  { slug: "peach-garden-roses", name: "Peach Garden Roses", category: "roses", occasions: ["birthday", "congratulations"], price: 34000, images: [["peach-garden.webp", "Peach garden roses in a glass vase"]], short: "Lush peach garden roses with seasonal foliage.", description: "Full, fragrant-looking garden roses in warm peach tones, paired with textured seasonal foliage for a generous, painterly feel.", composition: ["Garden roses", "Seasonal foliage"], colors: ["Peach", "Coral"], sizeLabel: "Medium" },
  { slug: "bridal-bouquet-crimson", name: "Crimson Bridal Bouquet", category: "wedding-events", occasions: [], price: 55000, images: [["bridal-bouquet.webp", "A bride holding a round bouquet of red and pink flowers"]], short: "A round bridal bouquet in crimson and rose.", description: "A rounded, generous bridal bouquet in crimson and rose tones. Every wedding is different — share your ideas in the order comment and we will be in touch.", composition: ["Roses", "Spray roses", "Seasonal accents"], colors: ["Crimson", "Pink"], sizeLabel: "Bridal" },
  { slug: "white-phalaenopsis", name: "White Phalaenopsis Orchid", category: "indoor-plants", occasions: ["thank-you", "congratulations"], price: 24000, images: [["white-orchid.webp", "A white phalaenopsis orchid in a white pot"]], short: "A graceful white orchid in a minimalist pot.", description: "A long-lasting white phalaenopsis orchid in a clean white pot — a gift that keeps blooming for weeks with simple care.", composition: ["Phalaenopsis orchid"], colors: ["White"], sizeLabel: "One plant", trackInventory: true, stock: 6 },
  { slug: "blush-orchid", name: "Blush Orchid", category: "indoor-plants", occasions: ["birthday"], price: 22000, images: [["pink-orchid.webp", "A pale pink orchid in a clear pot"]], short: "Soft pink orchid blooms on an elegant stem.", description: "Delicate blush blooms on an arching stem. Water sparingly and keep in bright, indirect light.", composition: ["Phalaenopsis orchid"], colors: ["Pink"], sizeLabel: "One plant", trackInventory: true, stock: 4 },
  { slug: "monstera-deliciosa", name: "Monstera Deliciosa", category: "indoor-plants", occasions: ["congratulations"], price: 26000, images: [["monstera.webp", "A monstera plant in a white pot held up against a white wall"]], short: "The iconic split-leaf plant for bright interiors.", description: "A lush, sculptural monstera in a white pot — a living gift for a new home or office.", composition: ["Monstera deliciosa"], colors: ["Green"], sizeLabel: "Medium plant", trackInventory: true, stock: 3 },
  { slug: "pink-tulips", name: "Pink Tulips", category: "bouquets", occasions: ["birthday", "thank-you"], price: 16000, images: [["tulips.webp", "Pink double tulips in a clear glass vase"]], short: "Fresh double tulips in a cheerful pink.", description: "Simple and joyful: a bunch of pink double tulips, tied with ribbon. Tulips keep growing in the vase — a little surprise every day.", composition: ["Tulips"], colors: ["Pink"], sizeLabel: "Small" },
  { slug: "dusty-rose-composition", name: "Dusty Rose Composition", category: "compositions", occasions: ["anniversary", "thank-you"], price: 48000, images: [["dusty-rose.webp", "A composition of mauve roses, lisianthus and greenery"]], short: "Mauve roses and lisianthus in a soft, painterly arrangement.", description: "An arrangement in dusty mauve and blush — roses, lisianthus and trailing greenery composed in a low, painterly shape.", composition: ["Roses", "Lisianthus (eustoma)", "Greenery"], colors: ["Mauve", "Blush"], sizeLabel: "Large", featured: true },
  { slug: "burgundy-garden-mix", name: "Burgundy Garden Mix", category: "compositions", occasions: ["anniversary", "congratulations"], price: 52000, compareAtPrice: 58000, images: [["burgundy-mix.webp", "A rich mix of burgundy roses, dahlias and purple accents"]], short: "Burgundy roses, dahlias and amaranth in a rich, deep palette.", description: "Our signature palette in flower form: burgundy roses, dahlias, celosia and amaranth, with touches of purple — dramatic, textured and unforgettable.", composition: ["Roses", "Dahlias", "Amaranth", "Celosia"], colors: ["Burgundy", "Purple"], sizeLabel: "Large", featured: true },
  { slug: "hydrangea-wooden-box", name: "Hydrangea Wooden Box", category: "flower-boxes", occasions: ["congratulations", "thank-you"], price: 36000, images: [["hydrangea-box.webp", "Blue hydrangea and white lisianthus in a wooden box"]], short: "Blue hydrangea and white blooms in a rustic wooden box.", description: "Fresh blue hydrangea, white lisianthus and lime accents arranged in a rustic wooden box.", composition: ["Hydrangea", "Lisianthus (eustoma)", "Chrysanthemum"], colors: ["Blue", "White", "Green"], sizeLabel: "Medium" },
  { slug: "ranunculus-celebration", name: "Ranunculus Celebration", category: "bouquets", occasions: ["birthday", "congratulations"], price: 31000, images: [["ranunculus.webp", "A colourful mass of ranunculus in pink, peach and yellow"]], short: "Layer upon layer of ranunculus in joyful colours.", description: "A celebration of ranunculus in peach, pink and sunshine yellow — paper-thin petals in generous layers.", composition: ["Ranunculus", "Anemones"], colors: ["Peach", "Yellow", "Pink"], sizeLabel: "Medium" },
  { slug: "peony-noir", name: "Peony Noir", category: "bouquets", occasions: ["love-romance"], price: 41000, images: [["peony-noir.webp", "Pink and lilac peonies against a black background"]], short: "Lilac and rose peonies with a touch of drama.", description: "Peonies in lilac, rose and cream, finished with airy accents — a bouquet with a quietly dramatic mood.", composition: ["Peonies", "Gypsophila"], colors: ["Lilac", "Pink"], sizeLabel: "Medium" },
];

async function seedDemoCatalogue() {
  const catIds = new Map<string, mongoose.Types.ObjectId>();
  let order = 0;
  for (const c of CATEGORIES) {
    const existing = await Category.findOne({ slug: c.slug }).lean();
    if (existing) {
      catIds.set(c.slug, existing._id as mongoose.Types.ObjectId);
      continue;
    }
    const img = await image(c.image, c.alt, "category");
    const doc = await Category.create({
      name: c.name,
      slug: c.slug,
      kind: c.kind,
      description: c.description,
      image: img,
      imageAlt: c.alt,
      sortOrder: order++,
      isActive: true,
      isFeatured: Boolean(c.featured),
      isSample: true,
    });
    catIds.set(c.slug, doc._id as mongoose.Types.ObjectId);
  }
  console.log(`✓ categories (${CATEGORIES.length})`);

  let created = 0;
  for (const p of PRODUCTS) {
    if (await Product.exists({ slug: p.slug })) continue;
    const images = [];
    for (const [file, alt] of p.images) images.push({ media: await image(file, alt, "product"), alt });
    await Product.create({
      name: p.name,
      slug: p.slug,
      shortDescription: p.short,
      description: p.description,
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? null,
      category: catIds.get(p.category),
      occasions: p.occasions.map((o) => catIds.get(o)).filter((id): id is mongoose.Types.ObjectId => Boolean(id)),
      images,
      composition: p.composition,
      colors: p.colors,
      sizeLabel: p.sizeLabel ?? "",
      dimensions: p.dimensions ?? "",
      careInstructions: p.category === "indoor-plants" ? "Keep in bright, indirect light. Water when the top of the soil feels dry; never leave the roots standing in water." : CARE,
      availability: "available",
      trackInventory: Boolean(p.trackInventory),
      stockQuantity: p.trackInventory ? (p.stock ?? 0) : null,
      isActive: true,
      isFeatured: Boolean(p.featured),
      isSample: true,
    });
    created++;
  }
  console.log(`✓ sample products (${created} new)`);

  if (!(await GalleryItem.exists({}))) {
    const gallery: [string, string][] = [
      ["gallery-1.webp", "Pink peonies with eucalyptus"],
      ["gallery-2.webp", "A florist composing a spring bouquet"],
      ["gallery-3.webp", "Peonies wrapped in kraft paper"],
      ["gallery-4.webp", "A blush rose arrangement on a wooden table"],
      ["gallery-5.webp", "Flowers and greenery laid out on a florist's table"],
      ["gallery-6.webp", "A loose arrangement in a dark jug"],
      ["gallery-7.webp", "A sculptural arrangement on a mantelpiece"],
      ["gallery-8.webp", "Close-up of soft pink garden roses"],
    ];
    let i = 0;
    for (const [file, alt] of gallery) {
      await GalleryItem.create({ image: await image(file, alt, "gallery"), alt, sortOrder: i++, isActive: true, isSample: true });
    }
    console.log("✓ gallery (sample images)");
  }

  const settings = await Settings.findById("store").lean();
  if (!settings?.content?.heroImage) {
    const hero = await image("hero-bouquet.webp", "A lush hand-tied bouquet of roses, astrantia and berries", "content");
    const story = await image("story-florist.webp", "A florist arranging roses and hydrangea", "content");
    await Settings.updateOne(
      { _id: "store" },
      {
        $set: {
          "content.heroImage": hero,
          "content.heroImageAlt": "A lush hand-tied bouquet of roses, astrantia and berries",
          "content.storyImage": story,
          "content.storyImageAlt": "A florist arranging roses and hydrangea",
        },
      },
    );
    console.log("✓ homepage imagery (sample)");
  }
}

async function main() {
  await connectDb();
  await seedSettings();
  await seedDeliveryMethods();
  if (DEMO) await seedDemoCatalogue();
  else console.log("• sample catalogue skipped (run with --demo to add it)");
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
