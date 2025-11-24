import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { connectToMongooseDatabase } from "../config/db.config";
import UserModel, { IUser } from "../models/user.model";
import RoleModel from "../models/role.model";

export interface RegisterUserDTO {
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  companyName?: string;
  password: string;
  roleName: "SUPERADMIN" | "EXHIBITOR" | "TEAMMANAGER" | "ENDUSER";
}

interface LoginData {
  email: string;
  password: string;
  skipPasswordCheck?: boolean;
}

// Register new user
export const registerUser = async (data: RegisterUserDTO) => {
  await connectToMongooseDatabase();

  // Validate at least one contact method
  if (!data.email && !data.phoneNumber) {
    throw new Error("At least one of email or phoneNumber must be provided");
  }

  // Check if user already exists
  const existingUser = await UserModel.findOne({ email: data.email });
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Find role by name
  const role = await RoleModel.findOne({ name: data.roleName, isDeleted: false });
  if (!role) {
    throw new Error(`Role '${data.roleName}' not found`);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Create user
  const newUser = await UserModel.create({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phoneNumber: data.phoneNumber,
    password: hashedPassword,
    role: role._id,
    companyName: data.companyName,
    isActive: true,
    isDeleted: false,
  });

  // Populate role to get role name
  await newUser.populate("role");

  return {
    user: {
      _id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      role: (newUser.role as any).name, // Just return role name
      companyName: newUser.companyName,
    },
  };
};

// Login user
export const loginUser = async (data: LoginData) => {
  await connectToMongooseDatabase();

  // Find user with password
  const user = await UserModel.findOne({ email: data.email, isDeleted: false })
    .select("+password")
    .populate("role");

  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Check if user is active
  if (!user.isActive) {
    throw new Error("Your account has been deactivated");
  }

  // Compare password (skip if this is after OTP verification)
  if (!data.skipPasswordCheck) {
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }
  }

  // Generate JWT token
  const token = jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: (user.role as any).name,
    },
    process.env.JWT_SECRET || "scan2card_secret"
  );

  return {
    token,
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: (user.role as any).name, // Just return role name
      companyName: user.companyName,
      twoFactorEnabled: user.twoFactorEnabled,
    },
  };
};

// Verify JWT token
export const verifyToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "scan2card_secret");
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};

// Get user by ID
export const getUserById = async (userId: string) => {
  await connectToMongooseDatabase();

  const user = await UserModel.findById(userId).populate("role");
  if (!user || user.isDeleted) {
    throw new Error("User not found");
  }

  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: (user.role as any).name, // Just return role name
    companyName: user.companyName,
    isActive: user.isActive,
    twoFactorEnabled: user.twoFactorEnabled,
  };
};
