import mongoose, { Schema, Document, model, Types, PaginateModel } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

// License Key Interface
export interface ILicenseKey {
  _id?: Types.ObjectId;
  key: string;
  stallName?: string;
  email: string;
  teamManagerId?: Types.ObjectId;
  expiresAt: Date;
  isActive: boolean;
  maxActivations: number;
  usedCount: number;
  usedBy: Types.ObjectId[];
  paymentStatus: "pending" | "completed";
  createdAt?: Date;
  updatedAt?: Date;
}

// Event Interface
export interface IEvent extends Document {
  eventName: string;
  description?: string;
  type: "Offline" | "Online" | "Hybrid";
  startDate: Date;
  endDate: Date;
  location?: {
    venue?: string;
    address?: string;
    city?: string;
  };
  licenseKeys: ILicenseKey[];
  exhibitorId: Types.ObjectId;
  isActive: boolean;
  isDeleted: boolean;
}

// Event Schema
const EventSchema = new Schema<IEvent>(
  {
    eventName: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ["Offline", "Online", "Hybrid"], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    location: {
      venue: { type: String },
      address: { type: String },
      city: { type: String },
    },
    licenseKeys: [
      new Schema(
        {
          key: { type: String, required: true },
          stallName: { type: String },
          email: { type: String, required: true },
          teamManagerId: { type: Schema.Types.ObjectId, ref: "Users" },
          expiresAt: { type: Date, required: true },
          isActive: { type: Boolean, default: true },
          maxActivations: { type: Number, default: 1 },
          usedCount: { type: Number, default: 0 },
          usedBy: [{ type: Schema.Types.ObjectId, ref: "Users" }],
          paymentStatus: { type: String, enum: ["pending", "completed"], default: "pending" },
        },
        { timestamps: true }
      ),
    ],
    exhibitorId: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

EventSchema.plugin(mongoosePaginate);

const EventModel = model<IEvent, PaginateModel<IEvent>>("Events", EventSchema);

export default EventModel;
