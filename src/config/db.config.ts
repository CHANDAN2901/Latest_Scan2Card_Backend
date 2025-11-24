import mongoose from "mongoose";

let isConnected = false;

export const connectToMongooseDatabase = async () => {
  if (isConnected) {
    return;
  }

  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/scan2card";

    await mongoose.connect(mongoUri);

    isConnected = true;
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};
