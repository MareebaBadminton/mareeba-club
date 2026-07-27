'use client'

import { useState, useEffect } from 'react'
import { fetchUnavailableDates } from '@/lib/utils/unavailableDateUtils'
import {
  getUpcomingCancellations,
  formatDisplayDate,
  type Cancellation,
} from '@/lib/utils/sessionDates'
import { getAustralianDateString } from '@/lib/utils/dateUtils'

const WINDOW_DAYS = 14

export default function AnnouncementPopup() {
  const [cancellations, setCancellations] = useState<Cancellation[]>([])
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Silently ignore failures: a popup that can't load its data should simply
    // not appear, rather than pushing an error at a visitor who didn't ask.
    fetchUnavailableDates()
      .then((dates) =>
        setCancellations(
          getUpcomingCancellations(dates, getAustralianDateString(), WINDOW_DAYS),
        ),
      )
      .catch(() => setCancellations([]))
  }, [])

  if (isDismissed || cancellations.length === 0) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6">
          <div className="relative mb-4">
            <h2 className="text-xl font-bold text-red-600 text-center">IMPORTANT NOTIFICATION</h2>
            <button
              onClick={() => setIsDismissed(true)}
              className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>

          <div className="text-gray-800 space-y-3">
            <p className="font-semibold text-center">📅 <strong>No sessions on:</strong></p>
            <div className="text-center space-y-2">
              {cancellations.map(({ date, reason }) => (
                <div key={date}>
                  <p className="font-medium">{formatDisplayDate(date)}</p>
                  <p className="text-sm text-gray-600">{reason}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-gray-600 mt-4">Thank you for your understanding! 🙏</p>
          </div>

          <div className="flex justify-center mt-6">
            <button
              onClick={() => setIsDismissed(true)}
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
