import { z } from 'zod'

export const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().regex(
    /^(?:\+?61|0)[2-478](?:[ -]?[0-9]){8}$/,
    'Please enter a valid Australian phone number'
  ),
  emergencyContact: z.string().min(2, 'Emergency contact name must be at least 2 characters'),
  emergencyPhone: z.string().regex(
    /^(?:\+?61|0)[2-478](?:[ -]?[0-9]){8}$/,
    'Please enter a valid Australian phone number'
  ),
})

export type RegisterFormData = z.infer<typeof registerSchema> 