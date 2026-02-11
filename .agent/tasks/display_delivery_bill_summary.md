# Task: Display Delivery Bill Image

## Overview
Added functionality to display the uploaded delivery bill image in the Admin Panel's "Order Delivery Detect" section.

## Changes
- **File:** `frontend/src/module/admin/components/orders/ViewOrderDetectDeliveryDialog.jsx`
- **Description:** 
  - Added a "Delivery Bill Uploaded" section to the order details modal.
  - If a bill image exists, it shows a clickable thumbnail (opens in new tab) with a hover effect.
  - If no bill image exists, it shows a "No bill uploaded yet" placeholder.
  - Uses `order.originalOrder.billImageUrl` to access the data.

## Verification
- Confirmed backend API (`getOrders` in `orderController.js`) returns `billImageUrl`.
- Confirmed `OrderDetectDelivery.jsx` passes the full order object as `originalOrder`.
- Confirmed `Order` model schema includes `billImageUrl`.
