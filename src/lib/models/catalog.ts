import { defineSchema, getModel, i18nField, ObjectId, type I18nOverrides, type Id } from "./_util";

const mediaSchema = defineSchema(
  {
    fileId: { type: ObjectId, required: true, unique: true },
    filename: { type: String, required: true, maxlength: 200 },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    alt: { type: String, maxlength: 300, default: "" },
    purpose: { type: String, enum: ["product", "category", "content", "gallery"], default: "product" },
    uploadedBy: { type: ObjectId, ref: "User", default: null },
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true },
);
export interface MediaDoc {
  _id: Id;
  fileId: Id;
  filename: string;
  contentType: string;
  size: number;
  width: number;
  height: number;
  alt: string;
  purpose: "product" | "category" | "content" | "gallery";
  uploadedBy: Id | null;
  isSample: boolean;
  createdAt: Date;
}
export const Media = getModel<MediaDoc>("Media", mediaSchema);

const categorySchema = defineSchema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    kind: { type: String, enum: ["collection", "occasion"], default: "collection", index: true },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    image: { type: ObjectId, ref: "Media", default: null },
    imageAlt: { type: String, maxlength: 200, default: "" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    seoTitle: { type: String, maxlength: 120, default: "" },
    seoDescription: { type: String, maxlength: 300, default: "" },
    i18n: i18nField({ name: 80, description: 1000, imageAlt: 200, seoTitle: 120, seoDescription: 300 }),
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true },
);
categorySchema.index({ isActive: 1, kind: 1, sortOrder: 1 });

export type CategoryText = Pick<CategoryDoc, "name" | "description" | "imageAlt" | "seoTitle" | "seoDescription">;

export interface CategoryDoc {
  _id: Id;
  name: string;
  slug: string;
  kind: "collection" | "occasion";
  description: string;
  image: Id | null;
  imageAlt: string;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  seoTitle: string;
  seoDescription: string;
  i18n?: I18nOverrides<CategoryText>;
  isSample: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export const Category = getModel<CategoryDoc>("Category", categorySchema);

const productImageSchema = defineSchema(
  {
    media: { type: ObjectId, ref: "Media", required: true },
    alt: { type: String, maxlength: 300, default: "" },
  },
  { _id: false },
);

const productSchema = defineSchema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    shortDescription: { type: String, trim: true, maxlength: 240, default: "" },
    description: { type: String, trim: true, maxlength: 5000, default: "" },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0, default: null },
    category: { type: ObjectId, ref: "Category", required: true, index: true },
    occasions: { type: [{ type: ObjectId, ref: "Category" }], default: [], index: true },
    images: { type: [productImageSchema], default: [] },
    composition: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    sizeLabel: { type: String, trim: true, maxlength: 60, default: "" },
    dimensions: { type: String, trim: true, maxlength: 80, default: "" },
    careInstructions: { type: String, trim: true, maxlength: 2000, default: "" },
    availability: { type: String, enum: ["available", "unavailable"], default: "available" },
    trackInventory: { type: Boolean, default: false },
    stockQuantity: { type: Number, min: 0, default: null },
    maxPerOrder: { type: Number, min: 1, max: 99, default: null },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    allowGiftMessage: { type: Boolean, default: true },
    seoTitle: { type: String, maxlength: 120, default: "" },
    seoDescription: { type: String, maxlength: 300, default: "" },
    unitsSold: { type: Number, default: 0 },
    archivedAt: { type: Date, default: null, index: true },
    i18n: i18nField({
      name: 120,
      shortDescription: 240,
      description: 5000,
      careInstructions: 2000,
      sizeLabel: 60,
      dimensions: 80,
      seoTitle: 120,
      seoDescription: 300,
      composition: [60],
      colors: [40],
      imageAlts: [300],
    }),
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true },
);
productSchema.index({ archivedAt: 1, isActive: 1, createdAt: -1 });
productSchema.index({ price: 1 });
productSchema.index({ unitsSold: -1 });

/** Translatable product text. `imageAlts` is aligned with `images` by position. */
export type ProductText = Pick<
  ProductDoc,
  "name" | "shortDescription" | "description" | "careInstructions" | "sizeLabel" | "dimensions" | "seoTitle" | "seoDescription" | "composition" | "colors"
> & { imageAlts: string[] };

export interface ProductDoc {
  _id: Id;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  category: Id;
  occasions: Id[];
  images: { media: Id; alt: string }[];
  composition: string[];
  colors: string[];
  sizeLabel: string;
  dimensions: string;
  careInstructions: string;
  availability: "available" | "unavailable";
  trackInventory: boolean;
  stockQuantity: number | null;
  maxPerOrder: number | null;
  isActive: boolean;
  isFeatured: boolean;
  allowGiftMessage: boolean;
  seoTitle: string;
  seoDescription: string;
  unitsSold: number;
  archivedAt: Date | null;
  i18n?: I18nOverrides<ProductText>;
  isSample: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export const Product = getModel<ProductDoc>("Product", productSchema);
