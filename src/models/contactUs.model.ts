import { Schema, Document, model, Types, PaginateModel } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

// ContactUs Interface - For contact form submissions
export interface IContactUs extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  subject: string;
  message: string;
  status: "pending" | "responded" | "resolved";
  addedBy?: Types.ObjectId;
  isActive: boolean;
  isDeleted: boolean;
}

// ContactUs Schema
const ContactUsSchema = new Schema<IContactUs>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["pending", "responded", "resolved"], default: "pending" },
    addedBy: { type: Schema.Types.ObjectId, ref: "Users" },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

ContactUsSchema.plugin(mongoosePaginate);

const ContactUsModel = model<IContactUs, PaginateModel<IContactUs>>("ContactUs", ContactUsSchema);

export default ContactUsModel;
