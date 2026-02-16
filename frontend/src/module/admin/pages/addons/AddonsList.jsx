import { useState, useMemo, useEffect, useRef } from "react"
import { Search, Trash2, Loader2, Plus, Edit2, Check, X, Filter, Sparkles, Tag, Upload } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { adminAPI } from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { API_BASE_URL } from "@/lib/api/config"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

export default function AddonsList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [addons, setAddons] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const fileInputRef = useRef(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAddon, setEditingAddon] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    categoryId: "",
    isActive: true,
    description: "",
    image: ""
  })

  const getImageUrl = (path) => {
    if (!path) return null
    if (path.startsWith('data:')) return path
    if (path.startsWith('http')) return path
    return `${API_BASE_URL.replace('/api', '')}${path}`
  }

  // Fetch data
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [addonsRes, categoriesRes] = await Promise.all([
        adminAPI.getAddons(),
        adminAPI.getCategories()
      ])

      if (addonsRes.data?.success) {
        setAddons(addonsRes.data.data.addons || [])
      }

      if (categoriesRes.data?.success) {
        setCategories(categoriesRes.data.data.categories || [])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load addons or categories")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (addon = null) => {
    setSelectedImageFile(null)
    if (addon) {
      setEditingAddon(addon)
      setImagePreview(getImageUrl(addon.image) || null)
      setFormData({
        name: addon.name,
        price: addon.price,
        categoryId: addon.categoryId?._id?.toString() || addon.categoryId?.id?.toString() || (typeof addon.categoryId === 'string' ? addon.categoryId : ""),
        isActive: addon.isActive,
        description: addon.description || "",
        image: addon.image || ""
      })
    } else {
      setEditingAddon(null)
      setImagePreview(null)
      setFormData({
        name: "",
        price: "",
        categoryId: "",
        isActive: true,
        description: "",
        image: ""
      })
    }
    setIsModalOpen(true)
  }

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload PNG, JPG, JPEG, or WEBP.")
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error("File size exceeds 5MB limit.")
      return
    }

    setSelectedImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setSelectedImageFile(null)
    setImagePreview(null)
    setFormData({ ...formData, image: "" })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.price || !formData.categoryId) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      setSubmitting(true)

      const formDataToSend = new FormData()
      Object.keys(formData).forEach(key => {
        if (key !== 'image') {
          formDataToSend.append(key, formData[key])
        }
      })

      if (selectedImageFile) {
        formDataToSend.append('image', selectedImageFile)
      } else if (formData.image) {
        formDataToSend.append('image', formData.image)
      }

      let response
      if (editingAddon) {
        response = await adminAPI.updateAddon(editingAddon._id, formDataToSend)
      } else {
        response = await adminAPI.createAddon(formDataToSend)
      }

      if (response.data?.success) {
        toast.success(`Addon ${editingAddon ? 'updated' : 'created'} successfully`)
        setIsModalOpen(false)
        fetchData()
      }
    } catch (error) {
      console.error("Error submitting addon:", error)
      toast.error(error.response?.data?.message || "Failed to save addon")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this addon?")) return

    try {
      setDeletingId(id)
      const response = await adminAPI.deleteAddon(id)
      if (response.data?.success) {
        toast.success("Addon deleted successfully")
        setAddons(addons.filter(a => a._id !== id))
      }
    } catch (error) {
      console.error("Error deleting addon:", error)
      toast.error("Failed to delete addon")
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleStatus = async (id) => {
    try {
      const response = await adminAPI.toggleAddonStatus(id)
      if (response.data?.success) {
        setAddons(addons.map(a =>
          a._id === id ? { ...a, isActive: !a.isActive } : a
        ))
        toast.success(`Addon ${response.data.data.addon.isActive ? 'activated' : 'deactivated'}`)
      }
    } catch (error) {
      console.error("Error toggling status:", error)
      toast.error("Failed to update status")
    }
  }

  const filteredAddons = useMemo(() => {
    return addons.filter(addon =>
      addon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      addon.categoryId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [addons, searchQuery])

  return (
    <div className="p-4 lg:p-8 bg-muted/40 min-h-screen">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-3xl shadow-sm border border-border p-8 mb-8"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm">
              <Sparkles className="text-primary w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Manage Addons</h1>
              <p className="text-muted-foreground font-medium flex items-center gap-2 mt-1">
                <Tag className="w-4 h-4 text-primary" />
                Customize your menu extras and options
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative group">
              <Input
                type="text"
                placeholder="Search addons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-4 py-6 w-full lg:w-[320px] rounded-2xl border-border bg-background group-hover:bg-accent/5 transition-all shadow-none focus:ring-primary/20"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground py-6 px-8 rounded-2xl shadow-lg shadow-primary/20 font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-5 h-5 mr-2 stroke-[3px]" />
              New Addon
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Table Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-3xl shadow-sm border border-border overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-8 py-5 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">SL</th>
                <th className="px-8 py-5 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Image</th>
                <th className="px-8 py-5 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Name</th>
                <th className="px-8 py-5 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Category</th>
                <th className="px-8 py-5 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Price</th>
                <th className="px-8 py-5 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                      <p className="text-muted-foreground font-medium animate-pulse">Fetching your addons...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAddons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-2">
                        <Search className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                      <p className="text-foreground font-bold text-lg">No addons found</p>
                      <p className="text-muted-foreground">Try adjusting your search or add a new one</p>
                    </div>
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredAddons.map((addon, index) => (
                    <motion.tr
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={addon._id}
                      className="hover:bg-muted/30 transition-all group"
                    >
                      <td className="px-8 py-5 whitespace-nowrap text-sm font-semibold text-muted-foreground">{index + 1}</td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted ring-1 ring-border group-hover:ring-primary/20 transition-all">
                          <img
                            src={getImageUrl(addon.image) || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop"}
                            alt={addon.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            onError={(e) => {
                              e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop"
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">{addon.name}</span>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <Badge variant="secondary" className="bg-muted text-muted-foreground border-none px-3 py-1 rounded-lg font-semibold hover:bg-primary/10 hover:text-primary transition-all">
                          {addon.categoryId?.name || "Uncategorized"}
                        </Badge>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          <span className="text-primary text-xs">₹</span>
                          <span>{addon.price.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={addon.isActive}
                            onCheckedChange={() => handleToggleStatus(addon._id)}
                            className="data-[state=checked]:bg-green-500"
                          />
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenModal(addon)}
                            className="w-10 h-10 rounded-xl text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(addon._id)}
                            disabled={deletingId === addon._id}
                            className="w-10 h-10 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
                          >
                            {deletingId === addon._id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
            <div className="bg-primary p-6 text-primary-foreground relative shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                  <Plus className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <DialogHeader className="p-0">
                    <DialogTitle className="text-xl font-bold text-primary-foreground leading-tight">
                      {editingAddon ? 'Edit Addon' : 'Create New Addon'}
                    </DialogTitle>
                    <p className="text-primary-foreground/90 text-sm mt-0.5">
                      {editingAddon ? 'Modify existing addon details' : 'Add a new extra item to your menu'}
                    </p>
                  </DialogHeader>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-primary-foreground/80" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-card">
              <form id="addon-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name" className="text-sm font-semibold text-foreground">Addon Name *</Label>
                    <div className="relative">
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Extra Cheese, Peri Peri..."
                        required
                        className="pl-4 h-11 bg-background border-border focus:bg-background focus:ring-primary/20 focus:border-primary transition-all rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoryId" className="text-sm font-semibold text-foreground">Category *</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                    >
                      <SelectTrigger className="h-11 bg-background border-border focus:ring-primary/20 focus:border-primary transition-all rounded-xl">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="z-[101] rounded-xl min-w-[200px] shadow-2xl border-border">
                        {categories && categories.length > 0 ? (
                          categories.map((cat) => {
                            const catId = (cat.id || cat._id || cat).toString();
                            return (
                              <SelectItem
                                key={catId}
                                value={catId}
                                className="rounded-lg cursor-pointer"
                              >
                                {cat.name || "Unnamed Category"}
                              </SelectItem>
                            );
                          })
                        ) : (
                          <div className="p-3 text-center text-xs text-muted-foreground italic">
                            No categories found
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-sm font-semibold text-foreground">Price * (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                        required
                        className="pl-8 h-11 bg-background border-border focus:bg-background focus:ring-primary/20 focus:border-primary transition-all rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-semibold text-foreground">Addon Image</Label>
                    <div className="flex flex-row items-center justify-between p-4 border-2 border-dashed border-border rounded-xl bg-muted/30 hover:bg-muted/50 hover:border-primary/50 transition-all gap-4">
                      {imagePreview ? (
                        <div className="relative group">
                          <div className="w-16 h-16 rounded-lg overflow-hidden ring-2 ring-background shadow-md">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute -top-1.5 -right-1.5 p-1 bg-destructive text-destructive-foreground rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-foreground">Click to upload</p>
                            <p className="text-[10px] text-muted-foreground">PNG, JPG up to 5MB</p>
                          </div>
                        </div>
                      )}
                      <Input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-9 px-4 rounded-lg border-border font-semibold text-xs ml-auto"
                      >
                        {imagePreview ? 'Change' : 'Select'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description" className="text-sm font-semibold text-foreground">Description (Optional)</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the addon..."
                      className="h-11 bg-background border-border focus:bg-background focus:ring-primary/20 focus:border-primary transition-all rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border transition-all hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${formData.isActive ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                      <Check className={`w-4 h-4 transition-transform ${formData.isActive ? 'scale-110' : 'scale-90'}`} />
                    </div>
                    <div>
                      <Label htmlFor="isActive" className="text-sm font-bold text-foreground cursor-pointer block">
                        Active Status
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {formData.isActive ? 'Addon will be visible in menu' : 'Addon will be hidden from menu'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
              </form>
            </div>

            <div className="p-6 bg-card border-t border-border">
              <DialogFooter className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 h-12 rounded-xl text-muted-foreground hover:bg-muted font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="addon-form"
                  disabled={submitting}
                  className="flex-[2] h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : null}
                  {editingAddon ? 'Edit Addon' : 'Create Addon'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </AnimatePresence>
    </div>
  )
}
