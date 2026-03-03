import { useState, useEffect, useMemo } from "react"
import { Search, Plus, Edit, Trash2, ToggleLeft, ToggleRight, Settings, ArrowUpDown, Check, Columns, DollarSign, Package } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { adminAPI } from "@/lib/api"
import { toast } from "sonner"

export default function EarningAddon() {
  const [searchQuery, setSearchQuery] = useState("")
  const [earningAddons, setEarningAddons] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedAddon, setSelectedAddon] = useState(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    title: true,
    requiredOrders: true,
    earningAmount: true,
    startDate: true,
    endDate: true,
    status: true,
    redemptions: true,
    actions: true,
  })

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    requiredOrders: "",
    earningAmount: "",
    startDate: "",
    endDate: "",
    maxRedemptions: "",
  })

  useEffect(() => {
    fetchEarningAddons()
  }, [])

  const fetchEarningAddons = async () => {
    try {
      setIsLoading(true)
      const response = await adminAPI.getEarningAddons()
      if (response.data.success) {
        const addons = response.data.data.earningAddons || []
