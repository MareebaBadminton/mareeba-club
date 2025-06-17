import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { email, firstName, lastName, playerId } = await req.json();

    if (!email || !firstName || !playerId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create transporter (configure this with your email service)
    const transporter = nodemailer.createTransport({
      // For Gmail (default)
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
      },
      // For custom SMTP (uncomment and set EMAIL_SERVICE to 'custom' in .env.local):
      // host: process.env.SMTP_HOST,
      // port: parseInt(process.env.SMTP_PORT || '587'),
      // secure: process.env.SMTP_SECURE === 'true',
      // auth: {
      //   user: process.env.SMTP_USER,
      //   pass: process.env.SMTP_PASSWORD,
      // },
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@mareeba-club.com',
      to: email,
      subject: 'Your Mareeba Badminton Club Player ID',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to Mareeba Badminton Club!</h2>
          
          <p>Hi ${firstName}${lastName ? ` ${lastName}` : ''},</p>
          
          <p>Thank you for registering with Mareeba Badminton Club! Your registration has been completed successfully.</p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Your Player ID:</h3>
            <p style="font-family: monospace; font-size: 18px; font-weight: bold; color: #1e40af; margin: 10px 0;">${playerId}</p>
            <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
              Please save this ID - you'll need it to book sessions.
            </p>
          </div>
          
          <h4>Next Steps:</h4>
          <ul>
            <li>Use your Player ID to book sessions on our website</li>
            <li>Keep this email for your records</li>
            <li>Contact us if you have any questions</li>
          </ul>
          
          <p>We look forward to seeing you at the club!</p>
          
          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            Mareeba Badminton Club
          </p>
        </div>
      `,
      text: `
Welcome to Mareeba Badminton Club!

Hi ${firstName}${lastName ? ` ${lastName}` : ''},

Thank you for registering with Mareeba Badminton Club! Your registration has been completed successfully.

Your Player ID: ${playerId}

Please save this ID - you'll need it to book sessions.

Next Steps:
- Use your Player ID to book sessions on our website
- Keep this email for your records
- Contact us if you have any questions

We look forward to seeing you at the club!

Best regards,
Mareeba Badminton Club
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', info.messageId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Player ID sent to email successfully',
      messageId: info.messageId 
    });

  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 