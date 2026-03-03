import { useState, useMemo } from "react"
import { UserCog, ChevronDown, ArrowUpDown, Trash2, Search, Download, Edit, Settings, FileText, FileSpreadsheet, Code, Check, Columns } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const modulePermissions = [
  // Column 1
  { id: "collectCash", label: "Collect cash" },
  { id: "category", label: "Category" },
  { id: "deliveryman", label: "Deliveryman" },
  { id: "pushNotification", label: "Push notification" },
  { id: "businessSettings", label: "Business settings" },
  { id: "contactMessages", label: "Contact messages" },
  { id: "chat", label: "Chat" },
  // Column 2
  { id: "addon", label: "Addon" },
  { id: "coupon", label: "Coupon" },
  { id: "deliverymenEarning", label: "Deliverymen earning provide" },
  { id: "order", label: "Order" },
  { id: "restaurantWithdraws", label: "Restaurant withdraws" },
  { id: "disbursement", label: "Disbursement" },
  // Column 3
  { id: "banner", label: "Banner" },
  { id: "customersSection", label: "Customers section" },
  { id: "employee", label: "Employee" },
  { id: "restaurants", label: "Restaurants" },
  { id: "posSystem", label: "Pos system" },
  { id: "advertisement", label: "Advertisement" },
  // Column 4
  { id: "campaign", label: "Campaign" },
  { id: "customerWallet", label: "Customer Wallet" },
  { id: "food", label: "Food" },
  { id: "report", label: "Report" },
  { id: "zone", label: "Zone" },
  { id: "cashback", label: "Cashback" },
]

const employeeRolesDummy = [
  {
    id: 1,
    roleName: "Manager",
    modules: ["Addon", "Banner", "Campaign", "Category", "Coupon", "Custom Role", "CustomerList", "Deliveryman", "Employee", "Food", "Notification", "Order", "Report", "Settings", "Pos", "Contact Message"],
    createdAt: "07 Feb 2023",
  },
  {
    id: 2,
    roleName: "Customer Care Executive",
    modules: ["CustomerList", "Deliveryman", "Order", "Restaurant"],
    createdAt: "22 Aug 2021",
  },
]

export default function EmployeeRole() {
  const [activeLanguage, setActiveLanguage] = useState("default")
  const [roleName, setRoleName] = useState("")
  const [permissions, setPermissions] = useState({})
  const [searchQuery, setSearchQuery] = useState("")
  const [roles, setRoles] = useState(employeeRolesDummy)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    roleName: true,
    modules: true,
    createdAt: true,
    actions: true,
  })

  const languageTabs = [
    { key: "default", label: "Default" },
    { key: "en", label: "English(EN)" },
    { key: "bn", label: "Bengali - বাংলা(BN)" },
    { key: "ar", label: "Arabic - العربية(AR)" },
    { key: "es", label: "Spanish - español(ES)" },
  ]

  const handlePermissionChange = (permissionId, checked) => {
    setPermissions(prev => ({
      ...prev,
      [permissionId]: checked
    }))
  }

  const handleSelectAll = (checked) => {
    const allPermissions = {}
    modulePermissions.forEach(permission => {
      allPermissions[permission.id] = checked
    })
    setPermissions(allPermissions)
  }

  const allSelected = useMemo(() => {
    return modulePermissions.every(permission => permissions[permission.id])
  }, [permissions])

  const handleSubmit = (e) => {
    e.preventDefault()
