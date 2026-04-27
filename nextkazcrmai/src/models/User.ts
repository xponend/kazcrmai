import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import bcrypt from "bcryptjs";

export type Role = "admin" | "manager" | "operator";

export interface UserAttrs {
  name: string;
  email: string;
  password: string;
  role: Role;
  skills: string[];
  currentLoad: number;
  isActive: boolean;
}

interface UserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

type UserModel = Model<UserAttrs, {}, UserMethods>;
export type UserDoc = HydratedDocument<UserAttrs, UserMethods>;

const userSchema = new Schema<UserAttrs, UserModel, UserMethods>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "manager", "operator"], default: "operator" },
    skills: { type: [String], default: [] },
    currentLoad: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<UserAttrs, UserModel>("User", userSchema);
