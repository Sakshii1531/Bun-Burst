
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './modules/order/models/Order.js';

dotenv.config();

const createDummyOrder = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const customerId = new mongoose.Types.ObjectId(); // Random User ID

        const order = new Order({
            orderId: `ORD-${Date.now()}`,
            userId: customerId,
            restaurantId: "REST-DUMMY-001",
            restaurantName: "Test Restaurant",
            items: [
                {
                    itemId: "ITEM-001",
                    name: "Test Burger",
                    price: 150,
                    quantity: 2,
                    isVeg: false
                }
            ],
            address: {
                label: "Home",
                formattedAddress: "123 Test St, Demo City",
                location: {
                    type: 'Point',
                    coordinates: [77.2090, 28.6139]
                }
            },
            pricing: {
                subtotal: 300,
                total: 300
            },
            payment: {
                method: "cash",
                status: "pending"
            },
            status: "confirmed", // This should appear as Accepted/Confirmed
            customerName: "Demo User",
            customerPhone: "+919876543210"
        });

        await order.save();
        console.log('Dummy order created successfully:', order.orderId);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error creating dummy order:', error);
        process.exit(1);
    }
};

createDummyOrder();
