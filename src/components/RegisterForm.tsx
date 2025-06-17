import { useState } from 'react'
import { createPlayer, getPlayerSyncStatus, syncPlayerToSheets } from '@/lib/utils/playerUtils'

export default function RegisterForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registeredPlayer, setRegisteredPlayer] = useState<{ id: string; firstName: string; syncStatus?: string } | null>(null)
  const [error, setError] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const form = e.currentTarget
    if (!form) return

    setIsSubmitting(true)
    setError('')

    try {
      const firstName = (form.elements.namedItem('firstName') as HTMLInputElement)?.value || ''
      const lastName = (form.elements.namedItem('lastName') as HTMLInputElement)?.value || ''
      const email = (form.elements.namedItem('email') as HTMLInputElement)?.value || ''

      if (!firstName || !lastName || !email) {
        setError('All fields are required')
        setIsSubmitting(false)
        return
      }

      // Create player with enhanced sync tracking
      const newPlayer = await createPlayer({
        firstName,
        lastName,
        email
      })

      console.log('Player registered successfully:', newPlayer)
      
      // Check sync status
      const syncStatus = await getPlayerSyncStatus(newPlayer.id)
      const syncMessage = syncStatus?.syncedToSheets 
        ? 'Registration complete and synced!' 
        : 'Registration complete. Sync in progress...'
      
      // Send Player ID via email
      try {
        const emailResponse = await fetch('/api/send-player-id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            firstName,
            lastName,
            playerId: newPlayer.id,
          }),
        });

        const emailResult = await emailResponse.json();
        
        if (emailResult.success) {
          console.log('Player ID email sent successfully');
        } else {
          console.warn('Failed to send Player ID email:', emailResult.error);
        }
      } catch (emailError) {
        console.warn('Email sending error:', emailError);
      }

      setRegisteredPlayer({
        id: newPlayer.id,
        firstName: newPlayer.firstName,
        syncStatus: syncMessage
      })
      
      // Reset form
      form.reset()
    } catch (error) {
      console.error('Registration error:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (registeredPlayer) {
    return (
      <div className="p-4 sm:p-6 bg-green-50 border border-green-200 rounded-md">
        <h3 className="text-lg sm:text-xl font-semibold text-green-800 mb-2">Registration Successful!</h3>
        <p className="mb-4 text-sm sm:text-base">Thank you for registering, {registeredPlayer.firstName}!</p>
        <div className="bg-white p-3 sm:p-4 rounded-md border border-green-300">
          <p className="font-medium text-sm sm:text-base">Your Player ID:</p>
          <p className="font-mono text-base sm:text-lg mt-1 break-all">{registeredPlayer.id}</p>
          <p className="text-xs sm:text-sm mt-2 text-green-600">
            {registeredPlayer.syncStatus}
          </p>
          <p className="text-xs sm:text-sm mt-2 text-gray-600">
            📧 We've sent your Player ID to your email address.
          </p>
          <p className="text-xs sm:text-sm mt-2 text-blue-600">
            💡 You can now use this ID to book sessions!
          </p>
        </div>
        
        <button
          onClick={() => setRegisteredPlayer(null)}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm sm:text-base"
        >
          Register Another Player
        </button>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              required
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 text-sm"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              required
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 px-4 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm sm:text-base ${
            isSubmitting
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  )
}