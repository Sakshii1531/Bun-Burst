import { useState, useMemo, useEffect, useRef } from "react"
import { Search, Trash2, Loader2, Plus, Edit2, Check, X, Sparkles, Tag, Upload } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { adminAPI, uploadAPI } from "@/lib/api"
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
  const [uploadingImage, setUploadingImage] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAddon, setEditingAddon] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    categoryId: "",
    isActive: true,
    description: "",
    image: "",
  })

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
    if (addon) {
      setEditingAddon(addon)
      setFormData({
        name: addon.name,
        price: addon.price,
        categoryId: addon.categoryId?._id?.toString() || addon.categoryId?.id?.toString() || (typeof addon.categoryId === 'string' ? addon.categoryId : ""),
        isActive: addon.isActive,
        description: addon.description || "",
        image: addon.image || "",
      })
    } else {
      setEditingAddon(null)
      setFormData({
        name: "",
        price: "",
        categoryId: "",
        isActive: true,
        description: "",
        image: "",
      })
    }
    setIsModalOpen(true)
  }

  const handleAddonImageUpload = async (file) => {
    if (!file) return

    try {
      setUploadingImage(true)
      const response = await uploadAPI.uploadMedia(file, { folder: "addons" })
      if (response.data?.success && response.data?.data?.url) {
        setFormData((prev) => ({ ...prev, image: response.data.data.url }))
        toast.success("Addon image uploaded successfully")
      } else {
        toast.error("Failed to upload image")
      }
    } catch (error) {
      console.error("Error uploading addon image:", error)
      toast.error("Failed to upload image")
    } finally {
      setUploadingImage(false)
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
      let response
      if (editingAddon) {
        response = await adminAPI.updateAddon(editingAddon._id, formData)
      } else {
        response = await adminAPI.createAddon(formData)
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
    <div className="p-4 lg:p-8 bg-slate-50/50 min-h-screen">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8 mb-8"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200 ring-4 ring-orange-50">
              <Sparkles className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Manage Addons</h1>
              <p className="text-slate-500 font-medium flex items-center gap-2 mt-1">
                <Tag className="w-4 h-4 text-orange-500" />
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
                className="pl-11 pr-4 py-6 w-full lg:w-[320px] rounded-2xl border-slate-200 bg-slate-50/50 group-hover:bg-white group-focus:bg-white transition-all shadow-none focus:ring-orange-500/20"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-orange-500 transition-colors" />
            </div>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-orange-600 hover:bg-orange-700 text-white py-6 px-8 rounded-2xl shadow-xl shadow-orange-200 font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
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
        className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">SL</th>
                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Name</th>
                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Category</th>
                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Price</th>
                <th className="px-8 py-5 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
                      <p className="text-slate-500 font-medium animate-pulse">Fetching your addons...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAddons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                        <Search className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-900 font-bold text-lg">No addons found</p>
                      <p className="text-slate-500">Try adjusting your search or add a new one</p>
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
                      className="hover:bg-slate-50/80 transition-all group"
                    >
                      <td className="px-8 py-5 whitespace-nowrap text-sm font-semibold text-slate-400">{index + 1}</td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <span className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{addon.name}</span>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none px-3 py-1 rounded-lg font-semibold hover:bg-orange-50 hover:text-orange-600 transition-all">
                          {addon.categoryId?.name || "Uncategorized"}
                        </Badge>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <span className="text-orange-600 text-xs">₹</span>
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
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white relative">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogHeader className="p-0">
                    <DialogTitle className="text-xl font-bold text-white leading-tight">
                      {editingAddon ? 'Update Addon' : 'Create New Addon'}
                    </DialogTitle>
                    <p className="text-orange-100 text-sm mt-0.5">
                      {editingAddon ? 'Modify existing addon details' : 'Add a new extra item to your menu'}
                    </p>
                  </DialogHeader>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/80" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 bg-white space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-slate-700">Addon Name *</Label>
                  <div className="relative">
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Extra Cheese, Peri Peri..."
                      required
                      className="pl-4 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:ring-orange-500/20 focus:border-orange-500 transition-all rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryId" className="text-sm font-semibold text-slate-700">Category *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  >
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:ring-orange-500/20 focus:border-orange-500 transition-all rounded-xl">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="z-[101] rounded-xl min-w-[200px] shadow-2xl border-slate-200">
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
                        <div className="p-3 text-center text-xs text-slate-500 italic">
                          No categories found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price" className="text-sm font-semibold text-slate-700">Price * (₹)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      required
                      className="pl-8 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:ring-orange-500/20 focus:border-orange-500 transition-all rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description" className="text-sm font-semibold text-slate-700">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the addon..."
                    className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:ring-orange-500/20 focus:border-orange-500 transition-all rounded-xl"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-semibold text-slate-700">Addon Image (Optional)</Label>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-slate-50 border border-slate-200 hover:bg-white cursor-pointer transition-all text-sm font-medium text-slate-700">
                      {uploadingImage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleAddonImageUpload(e.target.files?.[0])}
                        disabled={uploadingImage}
                      />
                    </label>
                    {formData.image ? (
                      <img
                        src={formData.image}
                        alt="Addon preview"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-slate-100/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${formData.isActive ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                    <Check className={`w-4 h-4 transition-transform ${formData.isActive ? 'scale-110' : 'scale-90'}`} />
                  </div>
                  <div>
                    <Label htmlFor="isActive" className="text-sm font-bold text-slate-800 cursor-pointer block">
                      Active Status
                    </Label>
                    <p className="text-xs text-slate-500">
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

              <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 h-12 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-[0.98]"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : null}
                  {editingAddon ? 'Update Addon' : 'Create Addon'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </AnimatePresence>
    </div>
  )
}
