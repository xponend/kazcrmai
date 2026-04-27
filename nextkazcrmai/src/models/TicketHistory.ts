import mongoose, { Schema, type HydratedDocument, type Types } from "mongoose";

export type HistoryAction =
  | "created"
  | "status_changed"
  | "assigned"
  | "priority_changed"
  | "ai_processed"
  | "comment";

export interface TicketHistoryAttrs {
  ticketId: Types.ObjectId;
  action: HistoryAction;
  oldValue?: string;
  newValue?: string;
  comment?: string;
  performedBy?: Types.ObjectId;
}

export type TicketHistoryDoc = HydratedDocument<TicketHistoryAttrs>;

const historySchema = new Schema<TicketHistoryAttrs>(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
    action: {
      type: String,
      enum: ["created", "status_changed", "assigned", "priority_changed", "ai_processed", "comment"],
      required: true,
    },
    oldValue: String,
    newValue: String,
    comment: String,
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

historySchema.index({ ticketId: 1, createdAt: -1 });

export const TicketHistory = mongoose.model<TicketHistoryAttrs>("TicketHistory", historySchema);
