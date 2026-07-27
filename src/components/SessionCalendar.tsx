'use client'

import {
  buildMonthGrid,
  getMonthLabel,
  SESSION_TIMES,
  type DayCell,
} from '@/lib/utils/sessionDates'

interface SessionCalendarProps {
  year: number
  month: number // 1-12
  todayStr: string
  unavailableDates: Record<string, string>
  onMonthChange: (year: number, month: number) => void
  /** When provided, session days become clickable (admin mode). */
  onDayClick?: (cell: DayCell) => void
  selectedDate?: string | null
}

const COLUMN_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function shiftMonth(year: number, month: number, delta: number) {
  const zeroBased = month - 1 + delta
  return {
    year: year + Math.floor(zeroBased / 12),
    month: ((zeroBased % 12) + 12) % 12 + 1,
  }
}

export default function SessionCalendar({
  year,
  month,
  todayStr,
  unavailableDates,
  onMonthChange,
  onDayClick,
  selectedDate,
}: SessionCalendarProps) {
  const weeks = buildMonthGrid(year, month, todayStr, unavailableDates)

  const go = (delta: number) => {
    const next = shiftMonth(year, month, delta)
    onMonthChange(next.year, next.month)
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => go(-1)}
          className="px-3 py-2 text-sm sm:text-base text-blue-600 hover:bg-blue-50 rounded-md font-medium"
          aria-label="Previous month"
        >
          ‹ Prev
        </button>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">
          {getMonthLabel(year, month)}
        </h3>
        <button
          onClick={() => go(1)}
          className="px-3 py-2 text-sm sm:text-base text-blue-600 hover:bg-blue-50 rounded-md font-medium"
          aria-label="Next month"
        >
          Next ›
        </button>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {COLUMN_LABELS.map((label) => (
          <div key={label} className="text-center text-xs sm:text-sm font-semibold text-gray-500 py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((cell, index) => {
          if (!cell.date) return <div key={`pad-${index}`} />

          const isSession = cell.session !== null
          const clickable = Boolean(onDayClick) && isSession
          const isSelected = selectedDate === cell.date

          let tone = 'text-gray-400'
          if (isSession && cell.isCancelled) tone = 'bg-red-50 text-red-700 line-through'
          else if (isSession) tone = 'bg-green-50 text-green-800 font-semibold'

          return (
            <button
              key={cell.date}
              type="button"
              disabled={!clickable}
              onClick={() => onDayClick?.(cell)}
              title={cell.reason ?? undefined}
              className={[
                'aspect-square rounded-md text-xs sm:text-sm flex flex-col items-center justify-center',
                tone,
                cell.isToday ? 'ring-2 ring-blue-500' : '',
                cell.isPast ? 'opacity-50' : '',
                isSelected ? 'ring-2 ring-orange-500' : '',
                clickable ? 'cursor-pointer hover:brightness-95' : 'cursor-default',
              ].join(' ')}
            >
              <span>{cell.dayOfMonth}</span>
              {isSession && !cell.isCancelled && (
                <span className="hidden sm:block text-[10px] leading-tight">
                  {SESSION_TIMES[cell.session!].time.split(' – ')[0]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs sm:text-sm text-gray-600">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-green-50 border border-green-200 inline-block" />
          Session on
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-red-50 border border-red-200 inline-block" />
          Cancelled
        </span>
      </div>
    </div>
  )
}
