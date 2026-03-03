
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

const checkZones = async () => {
    try {
        await mongoose.connect(MONGODB_URI);

        const activeZones = await Zone.find({ isActive: true }).lean();

        // Test Point for "Soham" restaurant (Indore)
        const testLat = 22.719568;
        const testLng = 75.857727;


        let restaurantInZone = false;
        let matchedZone = null;

        for (const zone of activeZones) {

            if (!zone.coordinates || zone.coordinates.length < 3) {
                continue;
            }

            // Log all coordinates to verify format

            // Ray casting algorithm from orderController.js
            let inside = false;
            for (let i = 0, j = zone.coordinates.length - 1; i < zone.coordinates.length; j = i++) {
                const coordI = zone.coordinates[i];
                const coordJ = zone.coordinates[j];

                // Inspect coordinate structure
                const xi = typeof coordI === 'object' ? (coordI.latitude ?? coordI.lat) : null;
                const yi = typeof coordI === 'object' ? (coordI.longitude ?? coordI.lng) : null;
                const xj = typeof coordJ === 'object' ? (coordJ.latitude ?? coordJ.lat) : null;
                const yj = typeof coordJ === 'object' ? (coordJ.longitude ?? coordJ.lng) : null;

                if (xi === null || yi === null || xj === null || yj === null) {
                    continue;
                }

                const intersect = ((yi > testLng) !== (yj > testLng)) &&
                    (testLat < (xj - xi) * (testLng - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }


            if (inside) {
                restaurantInZone = true;
                matchedZone = zone;
                // Don't break here, we want to see all matching zones or failure reasons
            }
        }

        if (restaurantInZone) {
        } else {
        }

    } catch (error) {
        console.error('❌ Error checking zones:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

checkZones();
