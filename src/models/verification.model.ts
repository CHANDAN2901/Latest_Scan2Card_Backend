import { Schema, Document, model, Types, PaginateModel } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

// Verification Interface - For OTP/Email verification
export interface IVerification extends Document {
  sentTo: string; // Email or phone number
  otp: number;
  otpValidTill: number; // Timestamp
  source: "email" | "phoneNumber";
  verificationCodeUsed: number; // How many times OTP was attempted
  addedBy?: Types.ObjectId;
  status: "pending" | "sent" | "failed";
  isVerified: boolean;
  isDeleted: boolean;
}

// Verification Schema
const VerificationSchema = new Schema<IVerification>(
  {
    sentTo: { type: String, required: true },
    otp: { type: Number, required: true },
    otpValidTill: { type: Number, required: true },
    source: { type: String, enum: ["email", "phoneNumber"], required: true },
    verificationCodeUsed: { type: Number, default: 0 },
    addedBy: { type: Schema.Types.ObjectId, ref: "Users" },
    status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
    isVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

VerificationSchema.plugin(mongoosePaginate);

const VerificationModel = model<IVerification, PaginateModel<IVerification>>("Verifications", VerificationSchema);

export default VerificationModel;
