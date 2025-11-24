import { Schema, Document, model } from "mongoose";

// Role Interface
export interface IRole extends Document {
  name: string;
  description: string;
  isActive: boolean;
  isDeleted: boolean;
}

// Role Schema
const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const RoleModel = model<IRole>("Roles", RoleSchema);

export default RoleModel;
