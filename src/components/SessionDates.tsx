'use client'

import { useState, useEffect } from 'react'
import SessionCalendar from './SessionCalendar'
import { fetchUnavailableDates } from '@/lib/utils/unavailableDateUtils'
import { SESSION_TIMES, formatDisplayDate, type DayCell } from '@/lib/utils/sessionDates'
import { getAustralianDateString } from '@/lib/utils/dateUtils'

export default function SessionDates() {
  const todayStr = getAustralianDateString()
  const [year, setYear] = useState(Number(todayStr.slice(0, 4)))
  const [month, setMonth] = useState(Number(todayStr.slice(5, 7)))
  const [unavailableDates, setUnavailableDates] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<DayCell | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUnavailableDates()
      .then(setUnavailableDates)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm sm:text-base">
          {error}
        </div>
      )}

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-gray-800">
        <p className="font-bold mb-1">Regular sessions</p>
        <ul className="list-disc list-inside ml-2 space-y-1 text-sm sm:text-base">
          <li>{SESSION_TIMES.friday.label}: {SESSION_TIMES.friday.time}</li>
          <li>{SESSION_TIMES.sunday.label}: {SESSION_TIMES.sunday.time}</li>
        </ul>
      </div>

      {isLoading ? (
        <p className="text-gray-500 py-8 text-center">Loading session dates…</p>
      ) : (
        <SessionCalendar
          year={year}
          month={month}
          todayStr={todayStr}
          unavailableDates={unavailableDates}
          selectedDate={selected?.date ?? null}
          onMonthChange={(y, m) => { setYear(y); setMonth(m); setSelected(null) }}
          onDayClick={(cell) => setSelected(cell.isCancelled ? cell : null)}
        />
      )}

      {selected?.isCancelled && selected.date && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="font-semibold text-red-700">
            No session on {formatDisplayDate(selected.date)}
          </p>
          <p className="text-sm text-red-600 mt-1">{selected.reason}</p>
        </div>
      )}
    </div>
  )
}
