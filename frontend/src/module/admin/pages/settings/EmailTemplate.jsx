import { useState } from "react"
import { 
  Mail, 
  Info, 
  Folder, 
  Upload, 
  FileText,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Save,
  RotateCcw
} from "lucide-react"

export default function EmailTemplate() {
  const [activeTemplate, setActiveTemplate] = useState("forgot-password")
  const [activeLanguage, setActiveLanguage] = useState("default")
  const [sendMailEnabled, setSendMailEnabled] = useState(true)
  
  // Template-specific default data
  const templateDefaults = {
    "forgot-password": {
      icon: null,
      mainTitle: "Change Password Request",
      mailBody: "The following user has forgotten his password & requested to change/reset their password. User Name: {userName}",
      footerText: "Footer Text Please contact us for any queries; we're always happy to help.",
      pageLinks: {
        privacyPolicy: true,
        refundPolicy: true,
        cancellationPolicy: true,
        contactUs: true
      },
      socialMediaLinks: {
        facebook: true,
        instagram: true,
        twitter: true,
        linkedin: true,
        pinterest: true
      },
      copyrightContent: "© 2023 StackFood. All rights reserved."
    },
    "new-restaurant": {
      icon: null,
      mainTitle: "New Restaurant Registration",
      mailBody: "A new restaurant has been registered on the platform. Restaurant Name: {restaurantName}, Owner: {ownerName}, Email: {email}, Phone: {phone}",
      footerText: "Please review and approve the restaurant registration. Contact us for any queries.",
      pageLinks: {
        privacyPolicy: true,
        refundPolicy: true,
        cancellationPolicy: true,
        contactUs: true
      },
      socialMediaLinks: {
        facebook: true,
        instagram: true,
        twitter: true,
        linkedin: true,
        pinterest: true
      },
      copyrightContent: "© 2023 StackFood. All rights reserved."
    },
    "new-deliveryman": {
      icon: null,
      mainTitle: "New Deliveryman Registration",
      mailBody: "A new deliveryman has registered on the platform. Name: {deliverymanName}, Email: {email}, Phone: {phone}, Vehicle Type: {vehicleType}",
      footerText: "Please review and approve the deliveryman registration. Contact us for any queries.",
      pageLinks: {
        privacyPolicy: true,
        refundPolicy: true,
        cancellationPolicy: true,
        contactUs: true
      },
      socialMediaLinks: {
        facebook: true,
        instagram: true,
        twitter: true,
        linkedin: true,
        pinterest: true
      },
      copyrightContent: "© 2023 StackFood. All rights reserved."
    },
    "withdraw-request": {
      icon: null,
      mainTitle: "Withdraw Request",
      mailBody: "A withdraw request has been submitted. Request ID: {requestId}, Amount: {amount}, Requested By: {requestedBy}, Account Details: {accountDetails}",
      footerText: "Please process the withdraw request. Contact us for any queries.",
      pageLinks: {
        privacyPolicy: true,
        refundPolicy: true,
        cancellationPolicy: true,
        contactUs: true
      },
      socialMediaLinks: {
        facebook: true,
        instagram: true,
        twitter: true,
        linkedin: true,
        pinterest: true
      },
      copyrightContent: "© 2023 StackFood. All rights reserved."
    },
    "campaign-join": {
      icon: null,
      mainTitle: "Campaign Join Request",
      mailBody: "A new campaign join request has been received. Campaign: {campaignName}, Restaurant: {restaurantName}, Requested By: {requestedBy}",
      footerText: "Please review and approve the campaign join request. Contact us for any queries.",
      pageLinks: {
        privacyPolicy: true,
        refundPolicy: true,
        cancellationPolicy: true,
        contactUs: true
      },
      socialMediaLinks: {
        facebook: true,
        instagram: true,
        twitter: true,
        linkedin: true,
        pinterest: true
      },
      copyrightContent: "© 2023 StackFood. All rights reserved."
    },
    "refund-request": {
      icon: null,
      mainTitle: "Refund Request",
      mailBody: "A refund request has been submitted. Order ID: {orderId}, Amount: {amount}, Customer: {customerName}, Reason: {reason}",
      footerText: "Please process the refund request. Contact us for any queries.",
      pageLinks: {
        privacyPolicy: true,
        refundPolicy: true,
        cancellationPolicy: true,
        contactUs: true
      },
      socialMediaLinks: {
        facebook: true,
        instagram: true,
        twitter: true,
        linkedin: true,
        pinterest: true
      },
      copyrightContent: "© 2023 StackFood. All rights reserved."
    },
    "new-advertisement": {
      icon: null,
      mainTitle: "New Advertisement",
      mailBody: "A new advertisement has been created. Ad Title: {adTitle}, Advertiser: {advertiserName}, Start Date: {startDate}, End Date: {endDate}",
      footerText: "Please review the advertisement details. Contact us for any queries.",
      pageLinks: {
        privacyPolicy: true,
        refundPolicy: true,
        cancellationPolicy: true,
        contactUs: true
      },
      socialMediaLinks: {
        facebook: true,
        instagram: true,
        twitter: true,
        linkedin: true,
        pinterest: true
      },
      copyrightContent: "© 2023 StackFood. All rights reserved."
    }
  }
  
  const [formData, setFormData] = useState(templateDefaults["forgot-password"])

  const templates = [
    { id: "forgot-password", label: "Forgot Password" },
    { id: "new-restaurant", label: "New Restaurant Registration" },
    { id: "new-deliveryman", label: "New Deliveryman Registration" },
    { id: "withdraw-request", label: "Withdraw Request" },
    { id: "campaign-join", label: "Campaign Join Request" },
    { id: "refund-request", label: "Refund Request" },
    { id: "new-advertisement", label: "New Advertisement" }
  ]

  const languages = [
    { id: "default", label: "Default" },
    { id: "en", label: "English(EN)" },
    { id: "bn", label: "Bengali - বাংলা (BN)" },
    { id: "ar", label: "Arabic - العربية (AR)" },
    { id: "es", label: "Spanish - español (ES)" }
  ]

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCheckboxChange = (section, field, checked) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: checked
      }
    }))
  }

  const handleFileUpload = (field, file) => {
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          [field]: reader.result
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
