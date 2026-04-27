import mongoose, { Schema, type HydratedDocument } from "mongoose";

export interface ClientAttrs {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  totalTickets: number;
  avgSatisfaction: number;
}

export type ClientDoc = HydratedDocument<ClientAttrs>;

const clientSchema = new Schema<ClientAttrs>(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    company: { type: String },
    totalTickets: { type: Number, default: 0 },
    avgSatisfaction: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Client = mongoose.model<ClientAttrs>("Client", clientSchema);
