'use client'

import { useState } from 'react'

interface RegistrationReminderModalProps {
  isVisible: boolean
  onProceed: () => void
}

export default function RegistrationReminderModal({ isVisible, onProceed }: RegistrationReminderModalProps) {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({
    0: false,
    1: false,
    2: false
  })

  const reminders = [
    "Thanks for signing up! Now hop over to \"Book Session.\"",
    "Even if you've booked, write your name when you walk in! 😄",
    "We're on the honesty system, mates — do your best! 🙌"
  ]

  const handleCheckboxChange = (index: number) => {
    setCheckedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const allChecked = Object.values(checkedItems).every(checked => checked)

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-red-600 text-center">Please Note:</h2>
            <p className="text-blue-600 text-sm mt-2 text-center">
              Important reminders before you proceed:
            </p>
          </div>
          
          {/* Reminders List */}
          <div className="space-y-3 mb-6">
            {reminders.map((reminder, index) => (
              <div key={index} className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id={`reminder-${index}`}
                  checked={checkedItems[index]}
                  onChange={() => handleCheckboxChange(index)}
                  className="mt-1 h-5 w-5 text-blue-600 border-2 border-red-500 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                />
                <label
                  htmlFor={`reminder-${index}`}
                  className="text-gray-800 text-sm leading-relaxed cursor-pointer flex-1"
                >
                  {reminder.split('**').map((part, i) => 
                    i % 2 === 1 ? <strong key={i} className="text-yellow-600">{part}</strong> : part
                  )}
                </label>
              </div>
            ))}
          </div>
          
          {/* Proceed Button */}
          <div className="flex justify-end">
            <button
              onClick={onProceed}
              disabled={!allChecked}
              className={`px-6 py-2 rounded-md text-white font-medium transition-colors ${
                allChecked
                  ? 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Proceed
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

