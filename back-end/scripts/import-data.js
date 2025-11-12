const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import all models
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Store = require('../src/models/Store');
const Review = require('../src/models/Review');
const Order = require('../src/models/Order');
const OrderItem = require('../src/models/OrderItem');
const Cart = require('../src/models/Cart');
const Address = require('../src/models/Address');
const Inventory = require('../src/models/Inventory');
const Voucher = require('../src/models/Voucher');
const Coupon = require('../src/models/Coupon');
const Payment = require('../src/models/Payment');
const ShippingInfo = require('../src/models/ShippingInfo');
const ReturnRequest = require('../src/models/ReturnRequest');
const Dispute = require('../src/models/Dispute');
const Conversation = require('../src/models/Conversation');
const Bid = require('../src/models/Bid');
const Feedback = require('../src/models/Feedback');
const Message = require('../src/models/Message');

// Map collection names to models
const modelMap = {
    'users': User,
    'products': Product,
    'categories': Category,
    'stores': Store,
    'reviews': Review,
    'orders': Order,
    'orderitems': OrderItem,
    'carts': Cart,
    'addresses': Address,
    'inventories': Inventory,
    'vouchers': Voucher,
    'coupons': Coupon,
    'payments': Payment,
    'shippinginfos': ShippingInfo,
    'returnrequests': ReturnRequest,
    'disputes': Dispute,
    'conversations': Conversation,
    'bids': Bid,
    'feedbacks': Feedback,
    'messages': Message,
};

// Convert MongoDB JSON format to Mongoose format
function convertMongoJSON(data) {
    if (Array.isArray(data)) {
        return data.map(item => convertMongoJSON(item));
    }

    if (data && typeof data === 'object') {
        const converted = {};
        for (const [key, value] of Object.entries(data)) {
            if (value && typeof value === 'object' && '$oid' in value) {
                converted[key] = new mongoose.Types.ObjectId(value.$oid);
            } else if (value && typeof value === 'object' && '$date' in value) {
                converted[key] = new Date(value.$date);
            } else {
                converted[key] = convertMongoJSON(value);
            }
        }
        return converted;
    }

    return data;
}

async function importCollection(collectionName, Model) {
    const dbPath = path.join(__dirname, '../../db');
    const fileName = `shopii.${collectionName}.json`;
    const filePath = path.join(dbPath, fileName);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${fileName}, skipping...`);
        return;
    }

    try {
        console.log(`\n📦 Importing ${collectionName}...`);

        // Read and parse JSON file
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);

        if (!Array.isArray(jsonData) || jsonData.length === 0) {
            console.log(`   ⚠️  No data in ${fileName}, skipping...`);
            return;
        }

        // Convert MongoDB JSON format
        const convertedData = convertMongoJSON(jsonData);

        // Clear existing collection (optional - comment out if you want to keep existing data)
        const existingCount = await Model.countDocuments();
        if (existingCount > 0) {
            console.log(`   🗑️  Clearing ${existingCount} existing documents...`);
            await Model.deleteMany({});
        }

        // Insert data
        const result = await Model.insertMany(convertedData, { ordered: false });
        console.log(`   ✅ Successfully imported ${result.length} ${collectionName}`);

    } catch (error) {
        if (error.code === 11000) {
            console.log(`   ⚠️  Duplicate key error for ${collectionName} (some documents may already exist)`);
        } else {
            console.error(`   ❌ Error importing ${collectionName}:`, error.message);
        }
    }
}

async function importAllData() {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shopii';

    console.log('🚀 Starting data import...');
    console.log(`📡 Connecting to MongoDB: ${MONGO_URI.replace(/\/\/.*@/, '//***@')}`);

    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Import in order (respecting dependencies)
        const importOrder = [
            'users',        // Must be first (referenced by others)
            'categories',   // Referenced by products
            'stores',       // Referenced by products
            'products',    // Referenced by many
            'inventories',  // References products
            'addresses',    // Standalone
            'carts',        // References products and users
            'vouchers',     // Standalone
            'coupons',      // Standalone
            'orders',       // References users
            'orderitems',   // References orders and products
            'payments',     // References orders
            'shippinginfos', // References orders
            'reviews',      // References products and users
            'returnrequests', // References orders
            'disputes',     // References orders
            'conversations', // References users
            'bids',         // References products and users
            'feedbacks',    // References users/orders
            'messages',     // References conversations
        ];

        for (const collectionName of importOrder) {
            const Model = modelMap[collectionName];
            if (Model) {
                await importCollection(collectionName, Model);
            }
        }

        console.log('\n✨ Data import completed!');

    } catch (error) {
        console.error('❌ Error during import:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
    }
}

// Run import
importAllData();

