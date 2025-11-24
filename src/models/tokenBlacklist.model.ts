import { Schema, Document, model, Types } from "mongoose";

// TokenBlacklist Interface - For JWT logout/security
export interface ITokenBlacklist extends Document {
  token: string;
  userId: Types.ObjectId;
  expiresAt: Date;
  blacklistedAt: Date;
  reason: "logout" | "password_change" | "account_deletion" | "admin_action";
  userAgent?: string;
  ipAddress?: string;
}

// TokenBlacklist Schema
const TokenBlacklistSchema = new Schema<ITokenBlacklist>(
  {
    token: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "Users", required: true, index: true },
    expiresAt: { type: Date, required: true, index: true, expires: 0 }, // TTL index
    blacklistedAt: { type: Date, default: Date.now, index: true },
    reason: { type: String, enum: ["logout", "password_change", "account_deletion", "admin_action"], default: "logout" },
    userAgent: { type: String },
    ipAddress: { type: String },
  },
  {
    timestamps: true,
    collection: "tokenBlacklists",
  }
);

const TokenBlacklistModel = model<ITokenBlacklist>("TokenBlacklist", TokenBlacklistSchema);

export default TokenBlacklistModel;
