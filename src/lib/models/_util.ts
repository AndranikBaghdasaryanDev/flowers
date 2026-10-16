import mongoose, { type Model, type Schema, type SchemaOptions } from "mongoose";

/** Builds a schema without triggering Mongoose's (compiler-expensive) definition type inference. */
export function defineSchema(definition: Record<string, unknown>, options?: SchemaOptions): Schema {
  return new mongoose.Schema(definition as never, options as never);
}

/**
 * Returns an existing compiled model (hot reload safe) or compiles a new one.
 * Document types are declared as explicit interfaces next to each schema;
 * Mongoose's automatic schema type inference is intentionally not used because
 * it is very expensive for the TypeScript compiler on large nested schemas.
 */
export function getModel<T>(name: string, schema: Schema): Model<T> {
  return (mongoose.models[name] as Model<T> | undefined) ?? (mongoose.model(name, schema) as unknown as Model<T>);
}

export const { ObjectId } = mongoose.Schema.Types;
export type Id = mongoose.Types.ObjectId;
