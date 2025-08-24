'use client'

import { useState, useEffect } from 'react'

interface UnavailableDatesPopupProps {
  isVisible: boolean
  onClose: () => void
}

export default function UnavailableDatesPopup({ isVisible, onClose }: UnavailableDatesPopupProps) {
  // Define all unavailable dates
  const unavailableDates = [
    { date: '2025-07-06', display: 'July 6th (SUN)' },
    { date: '2025-07-07', display: 'July 7th (MON)' },
    { date: '2025-07-11', display: 'July 11th (FRI)' },
    { date: '2025-07-13', display: 'July 13th (SUN)' },
    { date: '2025-07-18', display: 'July 18th (FRI)' }
  ]

  // Filter out dates that have already passed
  const getUpcomingDates = () => {
    const today = new Date()
    const todayString = today.toISOString().split('T')[0] // Get YYYY-MM-DD format
    
    return unavailableDates.filter(item => item.date >= todayString)
  }

  const upcomingDates = getUpcomingDates()

  // Hide popup if no upcoming unavailable dates or not visible
  if (!isVisible || upcomingDates.length === 0) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
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
          <div className="text-gray-800">
            <p className="font-semibold mb-4">
              No badminton sessions on {upcomingDates.length === 1 ? 'this date' : 'these dates'}:
            </p>
            
            <div className="space-y-2 mb-6">
              {upcomingDates.map((item, index) => (
                <div key={item.date}>
                  <span>{index + 1}. {item.display}</span>
                </div>
              ))}
            </div>
            
            <p className="text-center font-medium text-gray-700">Thank you for your understanding.</p>
          </div>
          
          {/* Close Button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 