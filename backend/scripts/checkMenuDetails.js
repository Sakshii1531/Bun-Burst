import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Import models
import Restaurant from "../modules/restaurant/models/Restaurant.js";
import Menu from "../modules/restaurant/models/Menu.js";

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err);
        process.exit(1);
    }
};

const checkMenuDetails = async () => {
    try {
        const restaurantId = "REST-1771312074475-1182";


        // Find restaurant
        const restaurant = await Restaurant.findOne({ restaurantId });

        if (!restaurant) {
            process.exit(1);
        }


        // Check Menu
        const menu = await Menu.findOne({ restaurant: restaurant._id });

        if (menu) {

            if (menu.sections && menu.sections.length > 0) {
                menu.sections.forEach((section, idx) => {

                    if (section.items && section.items.length > 0) {
                        section.items.forEach((item, itemIdx) => {
                        });
                    }
                });
            }
        } else {
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error);
        process.exit(1);
    }
};

// Run the script
connectDB().then(() => {
    checkMenuDetails();
});
