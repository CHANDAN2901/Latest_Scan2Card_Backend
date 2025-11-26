import { Request, Response } from "express";
import { registerUser, loginUser, getUserById } from "../services/auth.service";
import { AuthRequest } from "../middleware/auth.middleware";
import UserModel from "../models/user.model";
import OTPModel from "../models/otp.model";
import bcrypt from "bcryptjs";

// Register new user
export const register = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phoneNumber, password, roleName, companyName, exhibitorId } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password || !roleName) {
      return res.status(400).json({
        success: false,
        message: "firstName, lastName, email, password, and roleName are required",
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Password validation (minimum 6 characters)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Role validation
    const validRoles = ["SUPERADMIN", "EXHIBITOR", "TEAMMANAGER", "ENDUSER"];
    if (!validRoles.includes(roleName)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      });
    }

    const result = await registerUser({
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      roleName,
      companyName,
      exhibitorId,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("❌ Registration error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Registration failed",
    });
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Get user with password
    const user = await UserModel.findOne({ email, isDeleted: false })
      .select("+password")
      .populate("role", "roleName");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
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
      console.log(`🔐 2FA BYPASS OTP for ${email}: ${otp}`);

      return res.status(200).json({
        success: true,
        message: "OTP sent to your email",
        data: {
          requires2FA: true,
          userId: user._id,
          email: user.email,
        },
      });
    }

    // If 2FA is not enabled, proceed with normal login
    const result = await loginUser({ email, password });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error: any) {
    console.error("❌ Login error:", error);
    res.status(401).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
};

// Verify OTP for 2FA login
export const verifyLoginOTP = async (req: Request, res: Response) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: "User ID and OTP are required",
      });
    }

    // Find valid OTP
    const otpRecord = await OTPModel.findOne({
      userId,
      otp,
      purpose: "login",
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Get user and generate token
    const user = await UserModel.findById(userId).populate("role", "roleName");
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate token using the existing service
    const result = await loginUser({ 
      email: user.email, 
      password: user.password,
      skipPasswordCheck: true 
    });

    res.status(200).json({
      success: true,
      message: "2FA verification successful",
      data: result,
    });
  } catch (error: any) {
    console.error("❌ Verify OTP error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "OTP verification failed",
    });
  }
};

// Get current user profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await getUserById(req.user.userId);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error: any) {
    console.error("❌ Get profile error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to get profile",
    });
  }
};

// Send verification OTP to user's phone/email
export const sendVerificationOTP = async (req: Request, res: Response) => {
  try {
    const { userId, phoneNumber } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Find user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "User is already verified",
      });
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

    res.status(200).json({
      success: true,
      message: "Verification OTP sent successfully",
      data: {
        userId: user._id,
        phoneNumber: user.phoneNumber,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("❌ Send verification OTP error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to send verification OTP",
    });
  }
};

// Verify user with OTP
export const verifyUserOTP = async (req: Request, res: Response) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: "User ID and OTP are required",
      });
    }

    // Find valid OTP
    const otpRecord = await OTPModel.findOne({
      userId,
      otp,
      purpose: "verification",
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Update user's isVerified status
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isVerified = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: "User verified successfully",
      data: {
        userId: user._id,
        isVerified: user.isVerified,
      },
    });
  } catch (error: any) {
    console.error("❌ Verify user OTP error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "User verification failed",
    });
  }
};

// Forgot password - Send OTP
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find user by email
    const user = await UserModel.findOne({ email, isDeleted: false });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User with this email does not exist",
      });
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

    res.status(200).json({
      success: true,
      message: "Password reset OTP sent successfully",
      data: {
        userId: user._id,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("❌ Forgot password error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to send password reset OTP",
    });
  }
};

// Reset password with OTP
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { userId, otp, newPassword } = req.body;

    // Validation
    if (!userId || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "User ID, OTP, and new password are required",
      });
    }

    // Password validation (minimum 6 characters)
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
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
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Find user and update password
    const user = await UserModel.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
      data: {
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("❌ Reset password error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Password reset failed",
    });
  }
};
