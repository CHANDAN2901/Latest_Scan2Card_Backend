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
  exhibitorId?: string;
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
      isVerified: newUser.isVerified,
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
      isVerified: user.isVerified,
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
    isVerified: user.isVerified,
  };
};

// OTP-related services
import OTPModel from "../models/otp.model";

// Verify Login OTP
export const verifyLoginOTP = async (userId: string, otp: string) => {
  await connectToMongooseDatabase();

  // Find valid OTP
  const otpRecord = await OTPModel.findOne({
    userId,
    otp,
    purpose: "login",
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otpRecord) {
    throw new Error("Invalid or expired OTP");
  }

  // Mark OTP as used
  otpRecord.isUsed = true;
  await otpRecord.save();

  // Get user and generate token
  const user = await UserModel.findById(userId).populate("role", "name");

  if (!user) {
    throw new Error("User not found");
  }

  // Generate token using the existing service
  const result = await loginUser({
    email: user.email,
    password: user.password,
    skipPasswordCheck: true,
  });

  return result;
};

// Send Verification OTP
export const sendVerificationOTP = async (userId: string, phoneNumber?: string) => {
  await connectToMongooseDatabase();

  // Find user
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Check if user is already verified
  if (user.isVerified) {
    throw new Error("User is already verified");
  }

  // Update phone number if provided
  if (phoneNumber && phoneNumber !== user.phoneNumber) {
    user.phoneNumber = phoneNumber;
    await user.save();
  }

  // Generate OTP (using dummy OTP "000000" for testing)
  const otp = "000000";

  // Save OTP to database (expires in 10 minutes)
  await OTPModel.create({
    userId: user._id,
    otp,
    purpose: "verification",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  console.log(`📱 VERIFICATION OTP for ${user.email}: ${otp}`);

  return {
    userId: user._id,
    phoneNumber: user.phoneNumber,
    email: user.email,
  };
};

// Verify User OTP
export const verifyUserOTP = async (userId: string, otp: string) => {
  await connectToMongooseDatabase();

  // Find valid OTP
  const otpRecord = await OTPModel.findOne({
    userId,
    otp,
    purpose: "verification",
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otpRecord) {
    throw new Error("Invalid or expired OTP");
  }

  // Mark OTP as used
  otpRecord.isUsed = true;
  await otpRecord.save();

  // Update user's isVerified status
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  user.isVerified = true;
  await user.save();

  return {
    userId: user._id,
    isVerified: user.isVerified,
  };
};

// Forgot Password - Send OTP
export const sendForgotPasswordOTP = async (email: string) => {
  await connectToMongooseDatabase();

  // Find user by email
  const user = await UserModel.findOne({ email, isDeleted: false });
  if (!user) {
    throw new Error("User with this email does not exist");
  }

  // Generate OTP (using dummy OTP "000000" for testing)
  const otp = "000000";

  // Save OTP to database (expires in 10 minutes)
  await OTPModel.create({
    userId: user._id,
    otp,
    purpose: "forgot_password",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  console.log(`🔑 FORGOT PASSWORD OTP for ${email}: ${otp}`);

  return {
    userId: user._id,
    email: user.email,
  };
};

// Reset Password with OTP
export const resetPasswordWithOTP = async (
  userId: string,
  otp: string,
  newPassword: string
) => {
  await connectToMongooseDatabase();

  // Password validation (minimum 6 characters)
  if (newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters long");
  }

  // Find valid OTP
  const otpRecord = await OTPModel.findOne({
    userId,
    otp,
    purpose: "forgot_password",
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otpRecord) {
    throw new Error("Invalid or expired OTP");
  }

  // Mark OTP as used
  otpRecord.isUsed = true;
  await otpRecord.save();

  // Find user and update password
  const user = await UserModel.findById(userId).select("+password");
  if (!user) {
    throw new Error("User not found");
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();

  return {
    email: user.email,
  };
};

// Send 2FA Login OTP
export const send2FALoginOTP = async (userId: string) => {
  await connectToMongooseDatabase();

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Use bypass OTP "000000" for testing
  const otp = "000000";

  // Save OTP to database (expires in 10 minutes)
  await OTPModel.create({
    userId: user._id,
    otp,
    purpose: "login",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  // Bypass OTP for testing - always use 000000
  console.log(`🔐 2FA BYPASS OTP for ${user.email}: ${otp}`);

  return {
    requires2FA: true,
    userId: user._id,
    email: user.email,
  };
};
