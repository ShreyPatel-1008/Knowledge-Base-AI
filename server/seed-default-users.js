import "dotenv/config";
import mongoose from "mongoose";
import config from "./src/config/index.js";
import { User } from "./src/models/User.js";

async function seed() {
  await mongoose.connect(config.mongodbUri);
  console.log("Connected to MongoDB");

  const defaultUsers = [
    {
      name: "Alex Mercer",
      email: "alex@example.com",
      password: "Password123!",
    },
    {
      name: "Sarah Chen",
      email: "demo@example.com",
      password: "Password123!",
    },
  ];

  for (const def of defaultUsers) {
    let user = await User.findOne({ email: def.email });
    if (!user) {
      user = new User({
        name: def.name,
        email: def.email,
        password: def.password,
      });
      await user.save();
      console.log(`Created new default user: ${def.email}`);
    } else {
      user.name = def.name;
      user.password = def.password; // pre-save will rehash
      await user.save();
      console.log(`Reset password for default user: ${def.email}`);
    }
  }

  await mongoose.disconnect();
  console.log("Finished seeding default credentials.");
}

seed().catch(console.error);
