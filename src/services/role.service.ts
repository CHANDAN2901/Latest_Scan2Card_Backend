import { connectToMongooseDatabase } from "../config/db.config";
import RoleModel from "../models/role.model";

// Seed default roles
export const seedRoles = async () => {
  await connectToMongooseDatabase();

  const defaultRoles = [
    { name: "SUPERADMIN", description: "Creates and manages exhibitors. Oversees overall system activity." },
    { name: "EXHIBITOR", description: "Creates events, generates license keys, and manages team access." },
    { name: "TEAMMANAGER", description: "Manages team members participating in the event." },
    { name: "ENDUSER", description: "Scans attendee cards using OCR and saves lead data." },
  ];

  for (const role of defaultRoles) {
    const exists = await RoleModel.findOne({ name: role.name });
    if (!exists) {
      await RoleModel.create(role);
      console.log(`✅ Role created: ${role.name}`);
    }
  }
};
