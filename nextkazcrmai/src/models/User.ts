import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "../config/env";

export type Role = "admin" | "manager" | "operator" | "client";

export interface RefreshTokenEntry {
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface UserAttrs {
  name: string;
  email: string;
  password: string;
  role: Role;
  /** For role "client" — the company (Client doc) this portal user belongs to. */
  clientId?: Types.ObjectId;
  skills: string[];
  currentLoad: number;
  isActive: boolean;
  tokenVersion: number;
  refreshTokens: RefreshTokenEntry[];
}

interface UserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

type UserModel = Model<UserAttrs, {}, UserMethods>;
export type UserDoc = HydratedDocument<UserAttrs, UserMethods>;

const refreshTokenSchema = new Schema<RefreshTokenEntry>(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const userSchema = new Schema<UserAttrs, UserModel, UserMethods>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "manager", "operator", "client"], default: "operator" },
    clientId: { type: Schema.Types.ObjectId, ref: "Client" },
    skills: { type: [String], default: [] },
    currentLoad: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, env.BCRYPT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<UserAttrs, UserModel>("User", userSchema);
