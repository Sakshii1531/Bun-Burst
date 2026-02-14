import { useState, useEffect } from "react"
import { Save, Loader2, DollarSign, Plus, Trash2, Edit, MapPin, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { adminAPI } from "@/lib/api"
import { toast } from "sonner"

export default function FeeSettings() {
  const [feeSettings, setFeeSettings] = useState({
    distanceConfig: {
      maxDeliveryDistance: 20,
      slabs: []
    },
    amountConfig: {
      rules: []
    },
    platformFee: 5,
    gstRate: 5,
    deliveryFee: 25, // Legacy fallback
    deliveryFeeRanges: [], // Legacy
    freeDeliveryThreshold: 149 // Legacy
  })

  const [loadingFeeSettings, setLoadingFeeSettings] = useState(false)
  const [savingFeeSettings, setSavingFeeSettings] = useState(false)

  // Distance Slab State
  const [newSlab, setNewSlab] = useState({ minKm: '', maxKm: '', fee: '' })
  const [editingSlabIndex, setEditingSlabIndex] = useState(null)

  // Amount Rule State
  const [newRule, setNewRule] = useState({ minAmount: '', maxAmount: '', deliveryFee: '' })
  const [editingRuleIndex, setEditingRuleIndex] = useState(null)

  const fetchFeeSettings = async () => {
    try {
      setLoadingFeeSettings(true)
      const response = await adminAPI.getFeeSettings()
      if (response.data.success && response.data.data.feeSettings) {
        const data = response.data.data.feeSettings;
        setFeeSettings({
          distanceConfig: data.distanceConfig || { maxDeliveryDistance: 20, slabs: [] },
          amountConfig: data.amountConfig || { rules: [] },
          platformFee: data.platformFee || 5,
          gstRate: data.gstRate || 5,
          deliveryFee: data.deliveryFee || 25,
          deliveryFeeRanges: data.deliveryFeeRanges || [],
          freeDeliveryThreshold: data.freeDeliveryThreshold || 149
        })
      }
    } catch (error) {
      console.error('Error fetching fee settings:', error)
      toast.error('Failed to load fee settings')
    } finally {
      setLoadingFeeSettings(false)
    }
  }

  useEffect(() => {
    fetchFeeSettings()
  }, [])

  const handleSaveFeeSettings = async () => {
    try {
      setSavingFeeSettings(true)

      // Ensure numeric types
      const payload = {
        ...feeSettings,
        distanceConfig: {
          maxDeliveryDistance: Number(feeSettings.distanceConfig.maxDeliveryDistance),
          slabs: feeSettings.distanceConfig.slabs.map(s => ({
            minKm: Number(s.minKm),
            maxKm: Number(s.maxKm),
            fee: Number(s.fee)
          }))
        },
        amountConfig: {
          rules: feeSettings.amountConfig.rules.map(r => ({
            minAmount: Number(r.minAmount),
            maxAmount: Number(r.maxAmount),
            deliveryFee: Number(r.deliveryFee)
          }))
        },
        platformFee: Number(feeSettings.platformFee),
        gstRate: Number(feeSettings.gstRate),
        isActive: true
      };

      const response = await adminAPI.createOrUpdateFeeSettings(payload)

      if (response.data.success) {
        toast.success('Fee settings saved successfully')
        fetchFeeSettings()
      } else {
        toast.error(response.data.message || 'Failed to save fee settings')
      }
    } catch (error) {
      console.error('Error saving fee settings:', error)
      toast.error(error.response?.data?.message || 'Failed to save fee settings')
    } finally {
      setSavingFeeSettings(false)
    }
  }

  // --- Distance Slab Handlers ---
  const validateSlab = (slab, indexToIgnore = null) => {
    const min = Number(slab.minKm)
    const max = Number(slab.maxKm)
    const fee = Number(slab.fee)

    if (min < 0 || max < 0 || fee < 0) return 'All values must be positive'
    if (min >= max) return 'Min Km must be less than Max Km'

    const slabs = feeSettings.distanceConfig.slabs;
    for (let i = 0; i < slabs.length; i++) {
      if (indexToIgnore !== null && i === indexToIgnore) continue;
      const s = slabs[i];
      if ((min >= s.minKm && min < s.maxKm) || (max > s.minKm && max <= s.maxKm) || (min <= s.minKm && max >= s.maxKm)) {
        return 'Range overlaps with existing slab'
      }
    }
    return null;
  }

  const handleAddSlab = () => {
    if (newSlab.minKm === '' || newSlab.maxKm === '' || newSlab.fee === '') {
      toast.error('Please fill all fields'); return;
    }
    const error = validateSlab(newSlab);
    if (error) { toast.error(error); return; }

    const updatedSlabs = [...feeSettings.distanceConfig.slabs, {
      minKm: Number(newSlab.minKm),
      maxKm: Number(newSlab.maxKm),
      fee: Number(newSlab.fee)
    }].sort((a, b) => a.minKm - b.minKm);

    setFeeSettings({
      ...feeSettings,
      distanceConfig: { ...feeSettings.distanceConfig, slabs: updatedSlabs }
    });
    setNewSlab({ minKm: '', maxKm: '', fee: '' });
    toast.success('Distance slab added');
  }

  const handleUpdateSlab = () => {
    if (newSlab.minKm === '' || newSlab.maxKm === '' || newSlab.fee === '') {
      toast.error('Please fill all fields'); return;
    }
    const error = validateSlab(newSlab, editingSlabIndex);
    if (error) { toast.error(error); return; }

    const updatedSlabs = [...feeSettings.distanceConfig.slabs];
    updatedSlabs[editingSlabIndex] = {
      minKm: Number(newSlab.minKm),
      maxKm: Number(newSlab.maxKm),
      fee: Number(newSlab.fee)
    };
    updatedSlabs.sort((a, b) => a.minKm - b.minKm);

    setFeeSettings({
      ...feeSettings,
      distanceConfig: { ...feeSettings.distanceConfig, slabs: updatedSlabs }
    });
    setNewSlab({ minKm: '', maxKm: '', fee: '' });
    setEditingSlabIndex(null);
    toast.success('Distance slab updated');
  }

  const handleDeleteSlab = (index) => {
    const updatedSlabs = feeSettings.distanceConfig.slabs.filter((_, i) => i !== index);
    setFeeSettings({
      ...feeSettings,
      distanceConfig: { ...feeSettings.distanceConfig, slabs: updatedSlabs }
    });
  }

  const startEditSlab = (index) => {
    setNewSlab(feeSettings.distanceConfig.slabs[index]);
    setEditingSlabIndex(index);
  }

  // --- Amount Rule Handlers ---
  const validateRule = (rule, indexToIgnore = null) => {
    const min = Number(rule.minAmount)
    const max = Number(rule.maxAmount)
    const fee = Number(rule.deliveryFee)

    if (min < 0 || max < 0 || fee < 0) return 'Values must be positive'
    if (min >= max) return 'Min Amount must be less than Max Amount'

    const rules = feeSettings.amountConfig.rules;
    for (let i = 0; i < rules.length; i++) {
      if (indexToIgnore !== null && i === indexToIgnore) continue;
      const r = rules[i];
      if ((min >= r.minAmount && min < r.maxAmount) || (max > r.minAmount && max <= r.maxAmount) || (min <= r.minAmount && max >= r.maxAmount)) {
        return 'Range overlaps with existing rule'
      }
    }
    return null;
  }

  const handleAddRule = () => {
    if (newRule.minAmount === '' || newRule.maxAmount === '' || newRule.deliveryFee === '') {
      toast.error('Please fill all fields'); return;
    }
    const error = validateRule(newRule);
    if (error) { toast.error(error); return; }

    const updatedRules = [...feeSettings.amountConfig.rules, {
      minAmount: Number(newRule.minAmount),
      maxAmount: Number(newRule.maxAmount),
      deliveryFee: Number(newRule.deliveryFee)
    }].sort((a, b) => a.minAmount - b.minAmount);

    setFeeSettings({
      ...feeSettings,
      amountConfig: { ...feeSettings.amountConfig, rules: updatedRules }
    });
    setNewRule({ minAmount: '', maxAmount: '', deliveryFee: '' });
    toast.success('Amount rule added');
  }

  const handleUpdateRule = () => {
    if (newRule.minAmount === '' || newRule.maxAmount === '' || newRule.deliveryFee === '') {
      toast.error('Please fill all fields'); return;
    }
    const error = validateRule(newRule, editingRuleIndex);
    if (error) { toast.error(error); return; }

    const updatedRules = [...feeSettings.amountConfig.rules];
    updatedRules[editingRuleIndex] = {
      minAmount: Number(newRule.minAmount),
      maxAmount: Number(newRule.maxAmount),
      deliveryFee: Number(newRule.deliveryFee)
    };
    updatedRules.sort((a, b) => a.minAmount - b.minAmount);

    setFeeSettings({
      ...feeSettings,
      amountConfig: { ...feeSettings.amountConfig, rules: updatedRules }
    });
    setNewRule({ minAmount: '', maxAmount: '', deliveryFee: '' });
    setEditingRuleIndex(null);
    toast.success('Amount rule updated');
  }

  const handleDeleteRule = (index) => {
    const updatedRules = feeSettings.amountConfig.rules.filter((_, i) => i !== index);
    setFeeSettings({
      ...feeSettings,
      amountConfig: { ...feeSettings.amountConfig, rules: updatedRules }
    });
  }

  const startEditRule = (index) => {
    setNewRule(feeSettings.amountConfig.rules[index]);
    setEditingRuleIndex(index);
  }

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Delivery & Platform Fees</h1>
        </div>
        <p className="text-sm text-slate-600">
          Configure distance-based delivery fees and amount-based overrides.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6">
          {/* Header & Save */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Fee Configuration</h2>
            </div>
            <Button onClick={handleSaveFeeSettings} disabled={savingFeeSettings || loadingFeeSettings} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
              {savingFeeSettings ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Settings</>}
            </Button>
          </div>

          {loadingFeeSettings ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-green-600" /></div>
          ) : (
            <div className="space-y-10">

              {/* 1. Distance Configuration */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Distance Configuration</h3>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Delivery Distance (km)</label>
                  <input
                    type="number"
                    className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                    value={feeSettings.distanceConfig.maxDeliveryDistance}
                    onChange={(e) => setFeeSettings({ ...feeSettings, distanceConfig: { ...feeSettings.distanceConfig, maxDeliveryDistance: e.target.value } })}
                  />
                  <p className="text-xs text-slate-500 mt-1">Orders beyond this distance will be rejected.</p>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
                  <table className="w-full">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Min Km</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Max Km</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Delivery Fee (₹)</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {feeSettings.distanceConfig.slabs.map((slab, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm">{slab.minKm} km</td>
                          <td className="px-4 py-3 text-sm">{slab.maxKm} km</td>
                          <td className="px-4 py-3 text-sm font-medium text-green-600">₹{slab.fee}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => startEditSlab(i)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteSlab(i)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {feeSettings.distanceConfig.slabs.length === 0 && (
                        <tr><td colSpan="4" className="px-4 py-4 text-center text-slate-400 text-sm">No distance slabs configured</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Slab Form */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Min Km</label>
                    <input type="number" placeholder="0" className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-green-500"
                      value={newSlab.minKm} onChange={e => setNewSlab({ ...newSlab, minKm: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Max Km</label>
                    <input type="number" placeholder="5" className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-green-500"
                      value={newSlab.maxKm} onChange={e => setNewSlab({ ...newSlab, maxKm: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Fee (₹)</label>
                    <input type="number" placeholder="25" className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-green-500"
                      value={newSlab.fee} onChange={e => setNewSlab({ ...newSlab, fee: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    {editingSlabIndex !== null ? (
                      <>
                        <Button size="sm" onClick={handleUpdateSlab} className="bg-blue-600 hover:bg-blue-700 flex-1">Update</Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditingSlabIndex(null); setNewSlab({ minKm: '', maxKm: '', fee: '' }) }}>Cancel</Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={handleAddSlab} className="bg-green-600 hover:bg-green-700 flex-1"><Plus className="w-4 h-4 mr-1" /> Add</Button>
                    )}
                  </div>
                </div>
              </section>

              <div className="h-px bg-slate-200"></div>

              {/* 2. Amount Overrides */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingBag className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Amount Overrides</h3>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Overrides Distance Fee</span>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
                  <table className="w-full">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Min Order (₹)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Max Order (₹)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Delivery Fee (₹)</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {feeSettings.amountConfig.rules.map((rule, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm">₹{rule.minAmount}</td>
                          <td className="px-4 py-3 text-sm">₹{rule.maxAmount}</td>
                          <td className="px-4 py-3 text-sm font-medium text-indigo-600">
                            ₹{rule.deliveryFee}
                            {Number(rule.deliveryFee) === 0 && <span className="ml-2 text-green-600 text-xs bg-green-100 px-1.5 py-0.5 rounded">FREE</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => startEditRule(i)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteRule(i)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {feeSettings.amountConfig.rules.length === 0 && (
                        <tr><td colSpan="4" className="px-4 py-4 text-center text-slate-400 text-sm">No overrides configured</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Min Order (₹)</label>
                    <input type="number" placeholder="0" className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-green-500"
                      value={newRule.minAmount} onChange={e => setNewRule({ ...newRule, minAmount: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Max Order (₹)</label>
                    <input type="number" placeholder="1000" className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-green-500"
                      value={newRule.maxAmount} onChange={e => setNewRule({ ...newRule, maxAmount: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Delivery Fee (₹)</label>
                    <input type="number" placeholder="0" className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-green-500"
                      value={newRule.deliveryFee} onChange={e => setNewRule({ ...newRule, deliveryFee: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    {editingRuleIndex !== null ? (
                      <>
                        <Button size="sm" onClick={handleUpdateRule} className="bg-blue-600 hover:bg-blue-700 flex-1">Update</Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditingRuleIndex(null); setNewRule({ minAmount: '', maxAmount: '', deliveryFee: '' }) }}>Cancel</Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={handleAddRule} className="bg-green-600 hover:bg-green-700 flex-1"><Plus className="w-4 h-4 mr-1" /> Add</Button>
                    )}
                  </div>
                </div>
              </section>

              <div className="h-px bg-slate-200"></div>

              {/* 3. General Fees */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Platform Fee (₹)</label>
                  <input
                    type="number"
                    value={feeSettings.platformFee}
                    onChange={(e) => setFeeSettings({ ...feeSettings, platformFee: e.target.value })}
                    min="0"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <p className="text-xs text-slate-500">Fixed fee per order.</p>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">GST Rate (%)</label>
                  <input
                    type="number"
                    value={feeSettings.gstRate}
                    onChange={(e) => setFeeSettings({ ...feeSettings, gstRate: e.target.value })}
                    min="0" max="100"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <p className="text-xs text-slate-500">Applied on remaining subtotal.</p>
                </div>
              </section>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
