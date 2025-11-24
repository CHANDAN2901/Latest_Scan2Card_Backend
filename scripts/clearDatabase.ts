import dotenv from "dotenv";
import { connectToMongooseDatabase } from "../src/config/db.config";
import mongoose from "mongoose";

// Load environment variables
dotenv.config();

async function clearDatabase() {
  try {
    console.log("🗑️  Starting to clear database...");

    await connectToMongooseDatabase();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    // Drop users and roles collections
    await db.dropCollection("users").catch(() => {
      console.log("⏭️  Users collection doesn't exist, skipping...");
    });

    await db.dropCollection("roles").catch(() => {
      console.log("⏭️  Roles collection doesn't exist, skipping...");
    });

    console.log("✅ Database cleared successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    process.exit(1);
  }
}

clearDatabase();
