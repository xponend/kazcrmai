import mongoose, { Schema, type HydratedDocument, type Types } from "mongoose";

export type TicketStatus = "new" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface TicketAttrs {
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category?: string;
  aiCategory?: string;
  aiConfidence?: number;
  aiScore?: number;
  aiReason?: string;
  aiProcessedAt?: Date;
  clientId: Types.ObjectId;
  assigneeId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  resolvedAt?: Date;
  firstResponseAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type TicketDoc = HydratedDocument<TicketAttrs>;

const ticketSchema = new Schema<TicketAttrs>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ["new", "in_progress", "resolved", "closed"], default: "new" },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    category: String,
    aiCategory: String,
    aiConfidence: Number,
    aiScore: Number,
    aiReason: String,
    aiProcessedAt: Date,
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolvedAt: Date,
    firstResponseAt: Date,
  },
  { timestamps: true }
);

ticketSchema.index({ status: 1, priority: 1 });
ticketSchema.index({ assigneeId: 1, status: 1 });
ticketSchema.index({ clientId: 1 });
ticketSchema.index({ title: "text", description: "text" }, { weights: { title: 5, description: 1 } });

export const Ticket = mongoose.model<TicketAttrs>("Ticket", ticketSchema);
