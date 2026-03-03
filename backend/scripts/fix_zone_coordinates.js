
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Zone from '../modules/admin/models/Zone.js';

// Setup environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env file');
    process.exit(1);
}

const fixZoneCoordinates = async () => {
    try {
        await mongoose.connect(MONGODB_URI);

        const activeZones = await Zone.find({ isActive: true });

        if (activeZones.length === 0) {
            return;
        }

        // We assume the first zone is the one we want to fix (since debug showed only 1)
        // Or we can filter by name if we knew it.
        const zoneToFix = activeZones[0];


        // Define a generous box covering Indore
        // Lat: 22.6 to 22.8
        // Lng: 75.7 to 76.0
        const newCoordinates = [
            { latitude: 22.800000, longitude: 75.700000 }, // Top Left
            { latitude: 22.800000, longitude: 76.000000 }, // Top Right
            { latitude: 22.600000, longitude: 76.000000 }, // Bottom Right
            { latitude: 22.600000, longitude: 75.700000 }, // Bottom Left
            { latitude: 22.800000, longitude: 75.700000 }  // Close Loop
        ];

        zoneToFix.coordinates = newCoordinates;

        // boundary will be updated by pre-save hook
        await zoneToFix.save();


        // Verify with containsPoint logic locally (approximation)
        const testLat = 22.719568;
        const testLng = 75.857727;

        // Check if point is inside strictly
        // Simple manual check: 22.6 < 22.719 < 22.8 AND 75.7 < 75.857 < 76.0
        if (testLat > 22.6 && testLat < 22.8 && testLng > 75.7 && testLng < 76.0) {
        } else {
        }

    } catch (error) {
        console.error('❌ Error updating zone coordinates:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

fixZoneCoordinates();
