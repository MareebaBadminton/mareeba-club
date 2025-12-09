'use client'

import { useState, useEffect } from 'react'

interface AnnouncementPopupProps {
  isVisible: boolean
  onClose: () => void
}

export default function AnnouncementPopup({ isVisible, onClose }: AnnouncementPopupProps) {
  // Auto-hide after January 3rd, 2026
  const cutoffDate = new Date('2026-01-03')
  const today = new Date()
  if (!isVisible || today > cutoffDate) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="relative mb-4">
            <h2 className="text-xl font-bold text-red-600 text-center">IMPORTANT NOTIFICATION</h2>
            <button
              onClick={onClose}
              className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
          
          {/* Content */}
          <div className="text-gray-800 space-y-3">
            <p className="font-semibold text-center">
              📅 <strong>Sunday sessions are now from 3:00 PM to 5:00 PM</strong>
            </p>
            
            <p className="font-semibold text-center">
              🎄 <strong>No sessions on:</strong> 26/12/2025, 28/12/2025, and 2/1/2026 (Christmas holiday)
            </p>
            
            <p className="text-center text-gray-600">
              Thank you for your understanding! 🙏
            </p>
          </div>
          
          {/* Close Button */}
          <div className="flex justify-center mt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

