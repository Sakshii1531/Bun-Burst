import { useState, useEffect, useMemo } from "react"
import { 
  Search, 
  Settings, 
  ArrowUpDown, 
  Download, 
  ChevronDown, 
  FileText, 
  FileSpreadsheet, 
  Code, 
  Check, 
  Columns, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  RefreshCw, 
  User, 
  Package, 
  Wallet 
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { adminAPI } from "@/lib/api"
import { toast } from "sonner"

export default function EarningAddonHistory() {
  const [searchQuery, setSearchQuery] = useState("")
  const [history, setHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false)
  const [selectedHistory, setSelectedHistory] = useState(null)
  const [creditNotes, setCreditNotes] = useState("")
  const [isCheckingCompletions, setIsCheckingCompletions] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    deliveryman: true,
    offerTitle: true,
    ordersCompleted: true,
    earningAmount: true,
    date: true,
    status: true,
    actions: true,
  })

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      setIsLoading(true)
