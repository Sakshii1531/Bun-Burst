import DeliveryBoyCommission from '../models/DeliveryBoyCommission.js';
import { successResponse, errorResponse } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import mongoose from 'mongoose';

/**
 * Get all commission rules
 * GET /api/admin/delivery-boy-commission
 * Query params: status, search, page, limit
 */
export const getCommissionRules = asyncHandler(async (req, res) => {
  return successResponse(res, 200, 'Commission rules retrieved successfully', {
    commissions: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 100,
      pages: 0
    }
  });
});

/**
 * Get commission rule by ID
 * GET /api/admin/delivery-boy-commission/:id
 */
export const getCommissionRuleById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 400, 'Invalid commission rule ID');
    }

    const commission = await DeliveryBoyCommission.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    if (!commission) {
      return errorResponse(res, 404, 'Commission rule not found');
    }

    return successResponse(res, 200, 'Commission rule retrieved successfully', { commission });
  } catch (error) {
    console.error('Error fetching commission rule:', error);
    return errorResponse(res, 500, 'Failed to fetch commission rule');
  }
});

/**
 * Create new commission rule
 * POST /api/admin/delivery-boy-commission
 */
export const createCommissionRule = asyncHandler(async (req, res) => {
  return errorResponse(res, 400, 'Commission system is disabled. The system has transitioned to a fixed salary model.');
});

/**
 * Update commission rule
 * PUT /api/admin/delivery-boy-commission/:id
 */
export const updateCommissionRule = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { name, minDistance, maxDistance, commissionPerKm, basePayout, status } = req.body;
    const adminId = req.admin._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 400, 'Invalid commission rule ID');
    }

    const commission = await DeliveryBoyCommission.findById(id);
    if (!commission) {
      return errorResponse(res, 404, 'Commission rule not found');
    }

    // Validation
    if (name !== undefined && !name.trim()) {
      return errorResponse(res, 400, 'Name cannot be empty');
    }

    const newMinDist = minDistance !== undefined ? parseFloat(minDistance) : commission.minDistance;
    const newMaxDist = maxDistance !== undefined
      ? (maxDistance === null ? null : parseFloat(maxDistance))
      : commission.maxDistance;

    if (minDistance !== undefined && newMinDist < 0) {
      return errorResponse(res, 400, 'Minimum distance must be 0 or greater');
    }

    if (maxDistance !== undefined && newMaxDist !== null && newMaxDist <= newMinDist) {
      return errorResponse(res, 400, 'Maximum distance must be greater than minimum distance');
    }

    if (commissionPerKm !== undefined && commissionPerKm < 0) {
      return errorResponse(res, 400, 'Commission per km must be 0 or greater');
    }

    if (basePayout !== undefined && basePayout < 0) {
      return errorResponse(res, 400, 'Base payout must be 0 or greater');
    }

    // Check for overlapping ranges (excluding current rule)
    const existingRules = await DeliveryBoyCommission.find({
      status: true,
      _id: { $ne: id }
    });

    for (const rule of existingRules) {
      const ruleMin = parseFloat(rule.minDistance);
      const ruleMax = rule.maxDistance === null ? null : parseFloat(rule.maxDistance);

      // Check for overlap - two ranges overlap if they share any common distance
      let overlaps = false;

      if (newMaxDist === null && ruleMax === null) {
        // Both are unlimited - they overlap if min distances are compatible
        overlaps = true;
      } else if (newMaxDist === null) {
        // New range is unlimited, overlaps if it starts before or at rule's end
        overlaps = newMinDist <= ruleMax;
      } else if (ruleMax === null) {
        // Existing rule is unlimited, overlaps if it starts before or at new range's end
        overlaps = ruleMin <= newMaxDist;
      } else {
        // Both have finite ranges - check if they overlap
        // Ranges overlap if: newMinDist < ruleMax && ruleMin < newMaxDist
        overlaps = newMinDist < ruleMax && ruleMin < newMaxDist;
      }

      if (overlaps) {
        const ruleRangeStr = ruleMax === null
          ? `${ruleMin}km - Unlimited`
          : `${ruleMin}km - ${ruleMax}km`;
        const newRangeStr = newMaxDist === null
          ? `${newMinDist}km - Unlimited`
          : `${newMinDist}km - ${newMaxDist}km`;

        return errorResponse(
          res,
          400,
          `Distance range overlaps with existing rule "${rule.name}" (${ruleRangeStr}). Your range: ${newRangeStr}`
        );
      }
    }

    // Update fields
    if (name !== undefined) commission.name = name.trim();
    if (minDistance !== undefined) commission.minDistance = newMinDist;
    if (maxDistance !== undefined) commission.maxDistance = newMaxDist;
    if (commissionPerKm !== undefined) commission.commissionPerKm = parseFloat(commissionPerKm);
    if (basePayout !== undefined) commission.basePayout = parseFloat(basePayout);
    if (status !== undefined) commission.status = status;
    commission.updatedBy = adminId;

    await commission.save();

    const populatedCommission = await DeliveryBoyCommission.findById(commission._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    return successResponse(res, 200, 'Commission rule updated successfully', { commission: populatedCommission });
  } catch (error) {
    console.error('Error updating commission rule:', error);
    if (error.name === 'ValidationError') {
      return errorResponse(res, 400, error.message);
    }
    return errorResponse(res, 500, 'Failed to update commission rule');
  }
});

/**
 * Delete commission rule
 * DELETE /api/admin/delivery-boy-commission/:id
 */
export const deleteCommissionRule = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 400, 'Invalid commission rule ID');
    }

    const commission = await DeliveryBoyCommission.findById(id);
    if (!commission) {
      return errorResponse(res, 404, 'Commission rule not found');
    }

    await DeliveryBoyCommission.findByIdAndDelete(id);

    return successResponse(res, 200, 'Commission rule deleted successfully');
  } catch (error) {
    console.error('Error deleting commission rule:', error);
    return errorResponse(res, 500, 'Failed to delete commission rule');
  }
});

/**
 * Toggle commission rule status
 * PATCH /api/admin/delivery-boy-commission/:id/status
 */
export const toggleCommissionRuleStatus = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.admin._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 400, 'Invalid commission rule ID');
    }

    const commission = await DeliveryBoyCommission.findById(id);
    if (!commission) {
      return errorResponse(res, 404, 'Commission rule not found');
    }

    commission.status = status !== undefined ? status : !commission.status;
    commission.updatedBy = adminId;
    await commission.save();

    const populatedCommission = await DeliveryBoyCommission.findById(commission._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    return successResponse(res, 200, 'Commission rule status updated successfully', { commission: populatedCommission });
  } catch (error) {
    console.error('Error toggling commission rule status:', error);
    return errorResponse(res, 500, 'Failed to update commission rule status');
  }
});

/**
 * Calculate commission for a given distance
 * POST /api/admin/delivery-boy-commission/calculate
 */
export const calculateCommission = asyncHandler(async (req, res) => {
  return successResponse(res, 200, 'Commission calculated successfully', {
    commission: 0,
    breakdown: {
      basePayout: 0,
      distance: 0,
      commissionPerKm: 0,
      distanceCommission: 0
    }
  });
});

