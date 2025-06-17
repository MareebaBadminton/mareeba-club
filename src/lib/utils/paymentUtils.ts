import { supabase } from '../supabase'
import { getData, setData } from './storage'

export interface Payment {
  id: string
  bookingId: string
  playerId: string
  amount: number
  paymentMethod?: string
  paymentReference?: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  paymentDate?: string
  createdAt: string
  updatedAt: string
}

// Convert Supabase payment to our Payment interface
function convertSupabaseToPayment(supabasePayment: any): Payment {
  return {
    id: supabasePayment.id,
    bookingId: supabasePayment.booking_id,
    playerId: supabasePayment.player_id,
    amount: supabasePayment.amount,
    paymentMethod: supabasePayment.payment_method,
    paymentReference: supabasePayment.payment_reference,
    status: supabasePayment.status,
    paymentDate: supabasePayment.payment_date,
    createdAt: supabasePayment.created_at,
    updatedAt: supabasePayment.updated_at
  }
}

// Convert our Payment interface to Supabase format
function convertPaymentToSupabase(payment: Partial<Payment>) {
  return {
    id: payment.id,
    booking_id: payment.bookingId,
    player_id: payment.playerId,
    amount: payment.amount,
    payment_method: payment.paymentMethod,
    payment_reference: payment.paymentReference,
    status: payment.status,
    payment_date: payment.paymentDate,
    created_at: payment.createdAt,
    updated_at: payment.updatedAt
  }
}

// Get all payments
export async function getAllPayments(): Promise<Payment[]> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching payments from Supabase:', error)
      // Fallback to local storage
      return getData('PAYMENTS') as Payment[]
    }

    const payments = data.map(convertSupabaseToPayment)
    
    // Also save to local storage as cache
    setData('PAYMENTS', payments)
    
    return payments
  } catch (error) {
    console.error('Error in getAllPayments:', error)
    // Fallback to local storage
    return getData('PAYMENTS') as Payment[]
  }
}

// Get payments for a specific player
export async function getPlayerPayments(playerId: string): Promise<Payment[]> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching player payments from Supabase:', error)
      // Fallback to local storage
      const localPayments = getData('PAYMENTS') as Payment[]
      return localPayments.filter((payment: Payment) => payment.playerId === playerId)
    }

    return data.map(convertSupabaseToPayment)
  } catch (error) {
    console.error('Error in getPlayerPayments:', error)
    // Fallback to local storage
    const localPayments = getData('PAYMENTS') as Payment[]
    return localPayments.filter((payment: Payment) => payment.playerId === playerId)
  }
}

// Get payments for a specific booking
export async function getBookingPayments(bookingId: string): Promise<Payment[]> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching booking payments from Supabase:', error)
      // Fallback to local storage
      const localPayments = getData('PAYMENTS') as Payment[]
      return localPayments.filter((payment: Payment) => payment.bookingId === bookingId)
    }

    return data.map(convertSupabaseToPayment)
  } catch (error) {
    console.error('Error in getBookingPayments:', error)
    // Fallback to local storage
    const localPayments = getData('PAYMENTS') as Payment[]
    return localPayments.filter((payment: Payment) => payment.bookingId === bookingId)
  }
}

// Create a new payment
export async function createPayment(paymentData: {
  bookingId: string
  playerId: string
  amount: number
  paymentMethod?: string
  paymentReference?: string
  status?: 'pending' | 'completed' | 'failed' | 'refunded'
  paymentDate?: string
}): Promise<Payment | null> {
  try {
    const newPayment = {
      booking_id: paymentData.bookingId,
      player_id: paymentData.playerId,
      amount: paymentData.amount,
      payment_method: paymentData.paymentMethod || null,
      payment_reference: paymentData.paymentReference || null,
      status: paymentData.status || 'pending',
      payment_date: paymentData.paymentDate || null
    }

    const { data, error } = await supabase
      .from('payments')
      .insert([newPayment])
      .select()
      .single()

    if (error) {
      console.error('Error creating payment in Supabase:', error)
      
      // Fallback to local storage
      const payment: Payment = {
        id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        bookingId: paymentData.bookingId,
        playerId: paymentData.playerId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        paymentReference: paymentData.paymentReference,
        status: paymentData.status || 'pending',
        paymentDate: paymentData.paymentDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const existingPayments = getData('PAYMENTS') as Payment[]
      const updatedPayments = [...existingPayments, payment]
      setData('PAYMENTS', updatedPayments)
      
      return payment
    }

    const payment = convertSupabaseToPayment(data)
    
    // Also save to local storage
    const existingPayments = getData('PAYMENTS') as Payment[]
    const updatedPayments = [...existingPayments, payment]
    setData('PAYMENTS', updatedPayments)
    
    return payment
  } catch (error) {
    console.error('Error in createPayment:', error)
    return null
  }
}

// Update payment status
export async function updatePaymentStatus(
  paymentId: string, 
  status: 'pending' | 'completed' | 'failed' | 'refunded',
  paymentReference?: string,
  paymentDate?: string
): Promise<Payment | null> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }
    
    if (paymentReference) {
      updateData.payment_reference = paymentReference
    }
    
    if (paymentDate) {
      updateData.payment_date = paymentDate
    }

    const { data, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', paymentId)
      .select()
      .single()

    if (error) {
      console.error('Error updating payment in Supabase:', error)
      
      // Fallback to local storage
      const existingPayments = getData('PAYMENTS') as Payment[]
      const updatedPayments = existingPayments.map((payment: Payment) => {
        if (payment.id === paymentId) {
          return {
            ...payment,
            status,
            paymentReference: paymentReference || payment.paymentReference,
            paymentDate: paymentDate || payment.paymentDate,
            updatedAt: new Date().toISOString()
          }
        }
        return payment
      })
      setData('PAYMENTS', updatedPayments)
      
      return updatedPayments.find((p: Payment) => p.id === paymentId) || null
    }

    const payment = convertSupabaseToPayment(data)
    
    // Also update local storage
    const existingPayments = getData('PAYMENTS') as Payment[]
    const updatedPayments = existingPayments.map((p: Payment) => 
      p.id === paymentId ? payment : p
    )
    setData('PAYMENTS', updatedPayments)
    
    return payment
  } catch (error) {
    console.error('Error in updatePaymentStatus:', error)
    return null
  }
}

// Delete a payment (rarely used, but included for completeness)
export async function deletePayment(paymentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId)

    if (error) {
      console.error('Error deleting payment from Supabase:', error)
      
      // Fallback to local storage
      const existingPayments = getData('PAYMENTS') as Payment[]
      const updatedPayments = existingPayments.filter((payment: Payment) => payment.id !== paymentId)
      setData('PAYMENTS', updatedPayments)
      
      return true
    }

    // Also remove from local storage
    const existingPayments = getData('PAYMENTS') as Payment[]
    const updatedPayments = existingPayments.filter((payment: Payment) => payment.id !== paymentId)
    setData('PAYMENTS', updatedPayments)
    
    return true
  } catch (error) {
    console.error('Error in deletePayment:', error)
    return false
  }
}

// Get payment statistics
export async function getPaymentStats(): Promise<{
  totalPayments: number
  totalAmount: number
  pendingPayments: number
  completedPayments: number
  failedPayments: number
}> {
  try {
    const payments = await getAllPayments()
    
    return {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, payment) => sum + payment.amount, 0),
      pendingPayments: payments.filter(p => p.status === 'pending').length,
      completedPayments: payments.filter(p => p.status === 'completed').length,
      failedPayments: payments.filter(p => p.status === 'failed').length
    }
  } catch (error) {
    console.error('Error in getPaymentStats:', error)
    return {
      totalPayments: 0,
      totalAmount: 0,
      pendingPayments: 0,
      completedPayments: 0,
      failedPayments: 0
    }
  }
}