import Addon from '../models/Addon.js';
import { successResponse, errorResponse } from '../../../shared/utils/response.js';
import asyncHandler from '../../../shared/middleware/asyncHandler.js';

// @desc    Get all addons
// @route   GET /api/admin/addons
// @access  Private/Admin
export const getAddons = asyncHandler(async (req, res) => {
    const { categoryId, isActive } = req.query;
    const filter = {};

    if (categoryId) filter.categoryId = categoryId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const addons = await Addon.find(filter).populate('categoryId', 'name');

    return successResponse(res, 200, 'Addons retrieved successfully', { addons });
});

// @desc    Get single addon
// @route   GET /api/admin/addons/:id
// @access  Private/Admin
export const getAddonById = asyncHandler(async (req, res) => {
    const addon = await Addon.findById(req.params.id).populate('categoryId', 'name');

    if (!addon) {
        return errorResponse(res, 404, 'Addon not found');
    }

    return successResponse(res, 200, 'Addon retrieved successfully', { addon });
});

// @desc    Create new addon
// @route   POST /api/admin/addons
// @access  Private/Admin
export const createAddon = asyncHandler(async (req, res) => {
    const { name, price, categoryId, isActive, description, image } = req.body;

    const addon = await Addon.create({
        name,
        price,
        categoryId,
        isActive,
        description,
        image: image || '',
    });

    return successResponse(res, 201, 'Addon created successfully', { addon });
});

// @desc    Update addon
// @route   PUT /api/admin/addons/:id
// @access  Private/Admin
export const updateAddon = asyncHandler(async (req, res) => {
    let addon = await Addon.findById(req.params.id);

    if (!addon) {
        return errorResponse(res, 404, 'Addon not found');
    }

    const {
        name,
        price,
        categoryId,
        isActive,
        description,
        image,
    } = req.body;

    const updatePayload = {
        ...(name !== undefined ? { name } : {}),
        ...(price !== undefined ? { price } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(image !== undefined ? { image } : {}),
    };

    addon = await Addon.findByIdAndUpdate(req.params.id, updatePayload, {
        new: true,
        runValidators: true,
    });

    return successResponse(res, 200, 'Addon updated successfully', { addon });
});

// @desc    Delete addon
// @route   DELETE /api/admin/addons/:id
// @access  Private/Admin
export const deleteAddon = asyncHandler(async (req, res) => {
    const addon = await Addon.findById(req.params.id);

    if (!addon) {
        return errorResponse(res, 404, 'Addon not found');
    }

    await addon.deleteOne();

    return successResponse(res, 200, 'Addon deleted successfully');
});

// @desc    Toggle addon status
// @route   PATCH /api/admin/addons/:id/status
// @access  Private/Admin
export const toggleAddonStatus = asyncHandler(async (req, res) => {
    const addon = await Addon.findById(req.params.id);

    if (!addon) {
        return errorResponse(res, 404, 'Addon not found');
    }

    addon.isActive = !addon.isActive;
    await addon.save();

    return successResponse(res, 200, `Addon ${addon.isActive ? 'activated' : 'deactivated'} successfully`, { addon });
});

// @desc    Get addons by category (Public)
// @route   GET /api/addons/by-category/:categoryId
// @access  Public
export const getAddonsByCategory = asyncHandler(async (req, res) => {
    const { categoryId } = req.params;

    if (!categoryId) {
        return errorResponse(res, 400, 'Category ID is required');
    }

    const addons = await Addon.find({
        categoryId,
        isActive: true
    }).select('name price categoryId isActive image description');

    return successResponse(res, 200, 'Addons retrieved successfully', { addons });
});
