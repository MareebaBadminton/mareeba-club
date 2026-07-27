'use client'

import { useState, useEffect, useCallback } from 'react'
import SessionCalendar from '@/components/SessionCalendar'
import {
  fetchUnavailableDates,
  markDateUnavailable,
  restoreDate,
} from '@/lib/utils/unavailableDateUtils'
import { formatDisplayDate, type DayCell } from '@/lib/utils/sessionDates'
import { getAustralianDateString } from '@/lib/utils/dateUtils'

export default function AdminPage() {
  const todayStr = getAustralianDateString()

  const [password, setPassword] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [isAuthed, setIsAuthed] = useState(false)
  const [year, setYear] = useState(Number(todayStr.slice(0, 4)))
  const [month, setMonth] = useState(Number(todayStr.slice(5, 7)))
  const [unavailableDates, setUnavailableDates] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<DayCell | null>(null)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const reload = useCallback(async () => {
    try {
      setUnavailableDates(await fetchUnavailableDates())
    } catch (err) {
      setMessage(`❌ ${(err as Error).message}`)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        setMessage(`❌ ${data.error || 'Incorrect password'}`)
        return
      }
      // Held in state so it can accompany each write. Every write is
      // re-verified server-side; this flag only controls the UI.
      setPassword(passwordInput)
      setIsAuthed(true)
      setPasswordInput('')
    } catch {
      setMessage('❌ Could not reach the server. Please try again.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleCancel = async () => {
    if (!selected?.date) return
    setIsBusy(true)
    setMessage('')
    try {
      await markDateUnavailable(selected.date, reason, password)
      setMessage(`✅ ${formatDisplayDate(selected.date)} marked as no session.`)
      setReason('')
      setSelected(null)
      await reload()
    } catch (err) {
      setMessage(`❌ ${(err as Error).message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const handleRestore = async (date: string) => {
    setIsBusy(true)
    setMessage('')
    try {
      await restoreDate(date, password)
      setMessage(`✅ ${formatDisplayDate(date)} restored to a normal session.`)
      setSelected(null)
      await reload()
    } catch (err) {
      setMessage(`❌ ${(err as Error).message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const upcoming = Object.entries(unavailableDates)
    .filter(([date]) => date >= todayStr)
    .sort(([a], [b]) => a.localeCompare(b))

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <form onSubmit={handleLogin} className="max-w-sm mx-auto bg-white rounded-lg shadow-md p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Admin Login</h1>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Admin password"
            className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 text-gray-900"
            autoFocus
          />
          <button
            type="submit"
            disabled={isBusy || !passwordInput}
            className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isBusy ? 'Checking…' : 'Log in'}
          </button>
          {message && <p className="mt-4 text-sm">{message}</p>}
          <a href="/" className="block mt-6 text-center text-blue-600 hover:text-blue-800 underline text-sm">
            ← Back to main site
          </a>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Manage Session Dates</h1>
        <p className="text-sm text-gray-600 mb-6">
          Click a Friday or Sunday to mark it as having no session. Changes appear on the
          public site immediately.
        </p>

        {message && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            {message}
          </div>
        )}

        <SessionCalendar
          year={year}
          month={month}
          todayStr={todayStr}
          unavailableDates={unavailableDates}
          selectedDate={selected?.date ?? null}
          onMonthChange={(y, m) => { setYear(y); setMonth(m); setSelected(null) }}
          onDayClick={(cell) => { setSelected(cell); setReason(cell.reason ?? '') }}
        />

        {selected?.date && (
          <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <p className="font-semibold text-gray-900 mb-3">
              {formatDisplayDate(selected.date)}
            </p>
            {selected.isCancelled ? (
              <button
                onClick={() => handleRestore(selected.date!)}
                disabled={isBusy}
                className="w-full bg-green-600 text-white py-2 rounded-md font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {isBusy ? 'Working…' : 'Restore this session'}
              </button>
            ) : (
              <>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (optional), e.g. hall booked out"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3 text-gray-900"
                />
                <button
                  onClick={handleCancel}
                  disabled={isBusy}
                  className="w-full bg-red-600 text-white py-2 rounded-md font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {isBusy ? 'Working…' : 'Mark as no session'}
                </button>
              </>
            )}
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Upcoming cancellations</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500">None — all sessions are running.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map(([date, storedReason]) => (
                <li key={date} className="flex items-center justify-between gap-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="min-w-0">
                    <p className="font-medium text-red-700 text-sm">{formatDisplayDate(date)}</p>
                    <p className="text-xs text-red-600 truncate">{storedReason}</p>
                  </div>
                  <button
                    onClick={() => handleRestore(date)}
                    disabled={isBusy}
                    className="text-sm text-blue-600 hover:text-blue-800 underline whitespace-nowrap disabled:opacity-50"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <a href="/" className="block mt-8 text-center text-blue-600 hover:text-blue-800 underline text-sm">
          ← Back to main site
        </a>
      </div>
    </div>
  )
}
