import mongoose, { Schema, Document, model, Types, PaginateModel } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

// User Interface
export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  role: mongoose.Types.ObjectId;
  companyName?: string;
  exhibitorId?: mongoose.Types.ObjectId;
  team?: mongoose.Types.ObjectId;
  events?: mongoose.Types.ObjectId[];
  profileImage?: string;
  addedBy?: Types.ObjectId;
  twoFactorEnabled: boolean;
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// User Schema
const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String },
    password: { type: String, required: true, select: false },
    role: { type: Schema.Types.ObjectId, ref: "Roles", required: true },
    companyName: { type: String },
    exhibitorId: { type: Schema.Types.ObjectId, ref: "Users" },
    team: { type: Schema.Types.ObjectId, ref: "Teams" },
    events: [{ type: Schema.Types.ObjectId, ref: "Events" }],
    profileImage: { type: String },
    addedBy: { type: Schema.Types.ObjectId, ref: "Users" },
    twoFactorEnabled: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

UserSchema.plugin(mongoosePaginate);

const UserModel = model<IUser, PaginateModel<IUser>>("Users", UserSchema);

export default UserModel;
