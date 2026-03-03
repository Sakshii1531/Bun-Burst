import { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { MapPin, ArrowLeft } from "lucide-react"
import { adminAPI } from "@/lib/api"
import { getGoogleMapsApiKey } from "@/lib/utils/googleMapsApiKey"
import { Loader } from "@googlemaps/js-api-loader"

export default function ViewZone() {
  const navigate = useNavigate()
  const { id } = useParams()
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const polygonRef = useRef(null)
  
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("")
  const [mapLoading, setMapLoading] = useState(true)
  const [zone, setZone] = useState(null)
  const [loading, setLoading] = useState(true)

  // Memoize zone dependencies to keep dependency array stable
  const zoneId = useMemo(() => zone?._id ?? null, [zone?._id])
  const coordinatesLength = useMemo(() => zone?.coordinates?.length ?? 0, [zone?.coordinates?.length])

  useEffect(() => {
    fetchZone()
    // Load Google Maps immediately
    loadGoogleMaps()
  }, [id])

  // Trigger map resize when component is fully mounted
  useEffect(() => {
    if (mapInstanceRef.current && !mapLoading) {
      const timer = setTimeout(() => {
        if (window.google && window.google.maps && mapInstanceRef.current) {
          window.google.maps.event.trigger(mapInstanceRef.current, 'resize')
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [mapLoading])

  const fetchZone = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getZoneById(id)
      if (response.data?.success && response.data.data?.zone) {
        setZone(response.data.data.zone)
      }
    } catch (error) {
      console.error("Error fetching zone:", error)
      alert("Failed to load zone")
      navigate("/admin/zone-setup")
    } finally {
      setLoading(false)
    }
  }

  const loadGoogleMaps = async () => {
    try {
