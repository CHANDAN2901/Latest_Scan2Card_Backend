import dotenv from "dotenv";
import { connectToMongooseDatabase } from "../src/config/db.config";
import { registerUser } from "../src/services/auth.service";

// Load environment variables
dotenv.config();

const testUsers = [
  {
    firstName: "Admin",
    lastName: "User",
    email: "admin@scan2card.com",
    phoneNumber: "+1234567890",
    password: "admin123",
    roleName: "SUPERADMIN" as const,
  },
  {
    firstName: "John",
    lastName: "Exhibitor",
    email: "exhibitor@scan2card.com",
    phoneNumber: "+1234567891",
    password: "exhibitor123",
    roleName: "EXHIBITOR" as const,
    companyName: "Tech Corp Inc.",
  },
  {
    firstName: "Sarah",
    lastName: "Manager",
    email: "manager@scan2card.com",
    phoneNumber: "+1234567892",
    password: "manager123",
    roleName: "TEAMMANAGER" as const,
  },
  {
    firstName: "Mike",
    lastName: "Scanner",
    email: "enduser@scan2card.com",
    phoneNumber: "+1234567893",
    password: "enduser123",
    roleName: "ENDUSER" as const,
  },
  {
    firstName: "Test",
    lastName: "One",
    email: "test1@scan2card.com",
    phoneNumber: "+1234567894",
    password: "test1pass",
    roleName: "ENDUSER" as const,
  },
  {
    firstName: "Test",
    lastName: "Two",
    email: "test2@scan2card.com",
    phoneNumber: "+1234567895",
    password: "test2pass",
    roleName: "ENDUSER" as const,
  },
  {
    firstName: "Test",
    lastName: "Three",
    email: "test3@scan2card.com",
    phoneNumber: "+1234567896",
    password: "test3pass",
    roleName: "ENDUSER" as const,
  },
  {
    firstName: "Test",
    lastName: "Four",
    email: "test4@scan2card.com",
    phoneNumber: "+1234567897",
    password: "test4pass",
    roleName: "ENDUSER" as const,
  },
  {
    firstName: "Test",
    lastName: "Five",
    email: "test5@scan2card.com",
    phoneNumber: "+1234567898",
    password: "test5pass",
    roleName: "ENDUSER" as const,
  },
];

async function seedTestUsers() {
  try {
    console.log("🌱 Starting to seed test users...");

    await connectToMongooseDatabase();

    for (const userData of testUsers) {
      try {
        const result = await registerUser(userData);
        console.log(`✅ Created ${userData.roleName}: ${userData.email}`);
      } catch (error: any) {
        if (error.message.includes("already exists")) {
          console.log(`⏭️  User already exists: ${userData.email}`);
        } else {
          console.error(`❌ Error creating ${userData.email}:`, error.message);
        }
      }
    }

    console.log("\n🎉 Seeding completed!");
    console.log("\n📝 Test User Credentials:");
    console.log("=" .repeat(50));
    testUsers.forEach((user) => {
      console.log(`\n${user.roleName}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: ${user.password}`);
    });
    console.log("=" .repeat(50));

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedTestUsers();
