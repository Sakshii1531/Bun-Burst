import { useState, useMemo } from "react"
import { Users, ChevronDown, Search, Settings, Edit, Trash2, ArrowUpDown, Download, FileText, FileSpreadsheet, Code, Check, Columns } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const employeesDummy = [
  {
    id: 1,
    name: "Jhon",
    phone: "+81234567890",
    email: "jhon@gmail.com",
    createdAt: "07 Feb, 2023",
  },
  {
    id: 2,
    name: "Monali Khan",
    phone: "+81234567891",
    email: "test@gmail.com",
    createdAt: "22 Aug, 2021",
  },
]

export default function EmployeeList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [employees, setEmployees] = useState(employeesDummy)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    name: true,
    phone: true,
    email: true,
    createdAt: true,
    actions: true,
  })

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees
    const query = searchQuery.toLowerCase().trim()
    return employees.filter(employee =>
      employee.name.toLowerCase().includes(query) ||
      employee.email.toLowerCase().includes(query)
    )
  }, [employees, searchQuery])

  const maskPhone = (phone) => {
    if (!phone) return ""
    if (phone.length > 2) {
      return phone.slice(0, 2) + "*".repeat(phone.length - 2)
    }
    return phone
  }

  const maskEmail = (email) => {
    if (!email) return ""
    const [localPart, domain] = email.split("@")
    if (localPart.length > 1) {
      const masked = localPart[0] + "*".repeat(localPart.length - 1)
      return `${masked}@${domain}`
    }
    return email
  }

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      setEmployees(employees.filter(employee => employee.id !== id))
    }
  }

  const handleExport = (format) => {
    if (filteredEmployees.length === 0) {
      alert("No data to export")
      return
    }
