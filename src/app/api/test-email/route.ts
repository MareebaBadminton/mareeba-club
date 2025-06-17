import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { testEmail } = await req.json();

    if (!testEmail) {
      return NextResponse.json(
        { success: false, error: 'Test email address required' },
        { status: 400 }
      );
    }

    // Check environment variables
    const envCheck = {
      EMAIL_SERVICE: !!process.env.EMAIL_SERVICE,
      EMAIL_USER: !!process.env.EMAIL_USER,
      EMAIL_PASSWORD: !!process.env.EMAIL_PASSWORD,
      EMAIL_FROM: !!process.env.EMAIL_FROM,
    };

    console.log('Environment variables check:', envCheck);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return NextResponse.json({
        success: false,
        error: 'Email configuration missing',
        envCheck,
        message: 'EMAIL_USER or EMAIL_PASSWORD not configured in environment variables'
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Test connection
    try {
      await transporter.verify();
      console.log('SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('SMTP verification failed:', verifyError);
      return NextResponse.json({
        success: false,
        error: 'SMTP connection failed',
        details: verifyError instanceof Error ? verifyError.message : 'Unknown error',
        envCheck
      });
    }

    // Send test email
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@mareeba-club.com',
      to: testEmail,
      subject: 'Mareeba Badminton Club - Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Email Test Successful!</h2>
          <p>This is a test email from Mareeba Badminton Club.</p>
          <p>If you received this email, the email system is working correctly.</p>
          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            Test sent at: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}
          </p>
        </div>
      `,
      text: `Email Test Successful! This is a test email from Mareeba Badminton Club. Test sent at: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}`
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('Test email sent successfully:', info.messageId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully',
      messageId: info.messageId,
      envCheck
    });

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 