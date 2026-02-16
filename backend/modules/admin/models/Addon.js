import mongoose from 'mongoose';

const addonSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Addon name is required'],
            trim: true,
        },
        price: {
            type: Number,
            required: [true, 'Addon price is required'],
            default: 0,
        },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AdminCategoryManagement',
            required: [true, 'Category is required'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        description: {
            type: String,
            trim: true,
        },
        image: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
addonSchema.index({ name: 1 });
addonSchema.index({ categoryId: 1 });
addonSchema.index({ isActive: 1 });

const Addon = mongoose.model('Addon', addonSchema);

export default Addon;
