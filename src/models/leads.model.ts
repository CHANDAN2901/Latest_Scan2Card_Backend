import mongoose, { Schema, Document, model, Types, PaginateModel } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

// Lead Details Interface
interface ILeadDetails {
  firstName?: string;
  lastName?: string;
  company?: string;
  position?: string;
  email?: string;
  phoneNumber?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
}

// Lead Interface
export interface ILead extends Document {
  userId: Types.ObjectId;
  eventId?: Types.ObjectId;
  isIndependentLead: boolean;
  scannedCardImage: string;
  ocrText?: string;
  details: ILeadDetails;
  rating?: number;
  isActive: boolean;
  isDeleted: boolean;
}

// Lead Schema
const LeadSchema = new Schema<ILead>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Events" },
    isIndependentLead: { type: Boolean, default: false },
    scannedCardImage: { type: String, required: true },
    ocrText: { type: String },
    details: {
      firstName: { type: String },
      lastName: { type: String },
      company: { type: String },
      position: { type: String },
      email: { type: String },
      phoneNumber: { type: String },
      website: { type: String },
      address: { type: String },
      city: { type: String },
      country: { type: String },
      notes: { type: String },
    },
    rating: { type: Number, min: 1, max: 5 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

LeadSchema.plugin(mongoosePaginate);

const LeadModel = model<ILead, PaginateModel<ILead>>("Leads", LeadSchema);

export default LeadModel;
