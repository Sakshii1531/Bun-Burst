import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronDown } from "lucide-react"

/**
 * BottomPopup Component
 * A reusable animated bottom popup that can be dismissed by swiping down
 * 
 * @param {boolean} isOpen - Controls popup visibility
 * @param {function} onClose - Callback when popup is closed
 * @param {ReactNode} children - Content to display in popup
 * @param {string} title - Optional title for the popup
 * @param {boolean} showCloseButton - Show close button (default: true)
 * @param {boolean} closeOnBackdropClick - Close when backdrop is clicked (default: true)
 * @param {string} maxHeight - Maximum height of popup (default: "90vh")
 * @param {boolean} showHandle - Show drag handle (default: true)
 * @param {boolean} disableSwipeToClose - Disable swipe-to-close functionality (default: false)
 * @param {boolean} showBackdrop - Show backdrop overlay (default: true)
 * @param {boolean} backdropBlocksInteraction - Whether backdrop blocks pointer events (default: true)
 */
export default function BottomPopup({
  isOpen,
  onClose,
  children,
  title,
  showCloseButton = true,
  closeOnBackdropClick = true,
  maxHeight = "90vh",
  showHandle = true,
  disableSwipeToClose = false,
  collapsedContent = null, // Content to show when collapsed (e.g., Reached pickup button)
  showBackdrop = true, // Show backdrop overlay
  backdropBlocksInteraction = true, // Whether backdrop blocks pointer events
  panelClassName = ""
}) {
  const popupRef = useRef(null)
  const handleRef = useRef(null)
  const swipeStartY = useRef(0)
  const isSwiping = useRef(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Reset drag state when popup closes
  useEffect(() => {
    if (!isOpen) {
      setDragY(0)
      setIsDragging(false)
      isSwiping.current = false
      setIsCollapsed(false)
    }
  }, [isOpen])

  // Handle collapse toggle
  const handleCollapseToggle = (e) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    setIsCollapsed(prev => {
      const newState = !prev
