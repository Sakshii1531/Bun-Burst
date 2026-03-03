import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
    ArrowLeft,
    Search,
    Plus,
    X,
    Upload,
    Loader2,
    Utensils,
    ChevronDown,
    ChevronRight,
    Save,
    Edit2,
    Trash2,
    Minus
} from "lucide-react"
import { adminAPI, restaurantAPI, uploadAPI } from "@/lib/api"
import { toast } from "sonner"

export default function MenuAdd() {
    const navigate = useNavigate()
    const location = useLocation()
    const [restaurants, setRestaurants] = useState([])
    const [selectedRestaurant, setSelectedRestaurant] = useState(null)
    const [menu, setMenu] = useState(null)
    const [globalCategories, setGlobalCategories] = useState([])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [showAddDishModal, setShowAddDishModal] = useState(false)
    const [selectedSection, setSelectedSection] = useState(null)
    const [expandedSections, setExpandedSections] = useState({})
    const [saving, setSaving] = useState(false)
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState("")
    const [creatingCategory, setCreatingCategory] = useState(false)
    const [editingDish, setEditingDish] = useState(null) // { dish, section }
    const [deletingDish, setDeletingDish] = useState(false)
    const dishSectionRef = useRef(null)

    const normalizeSearchValue = (value) =>
        String(value ?? "")
            .toLowerCase()
            .replace(/\s+/g, "")
            .trim()

    // Preparation time options
    const preparationTimeOptions = [
        "10-20 mins",
        "20-25 mins",
        "25-35 mins",
        "35-45 mins",
        "45-60 mins",
        "60+ mins"
    ]

    // Form data for new dish
    const [formData, setFormData] = useState({
        name: "",
        image: "",
        images: [],
        price: 0,
        categoryId: "",
        foodType: "Non-Veg",
        category: "",
        description: "",
        preparationTime: "",
        isAvailable: true,
        isRecommended: false,
        stock: true, // Stock toggle - true means in stock
        hasVariants: false, // Checkbox to enable variants
        variants: [], // Array of variants: [{ id, name, price, stock }]
    })

    // Fetch restaurants and global categories
    useEffect(() => {
        fetchRestaurants()
        fetchGlobalCategories()
    }, [])

    const fetchGlobalCategories = async () => {
        try {
            const response = await adminAPI.getCategories()
            if (response.data?.success) {
                setGlobalCategories(response.data.data.categories || [])
            }
        } catch (error) {
            console.error("Error fetching global categories:", error)
        }
    }

    // Pre-select restaurant from navigation state
    useEffect(() => {
        if (restaurants.length > 0 && location.state?.restaurantId && !selectedRestaurant) {
            const found = restaurants.find(r => r._id === location.state.restaurantId || r.id === location.state.restaurantId)
            if (found) {
