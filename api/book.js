import { google } from 'googleapis';
import nodemailer from 'nodemailer'; // ईमेल भेजने के लिए नया टूल

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  try {
    const { name, email, dateTime, phone, issue } = req.body; 

    // 1. Google Calendar में सेव करना
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    });

    const calendar = google.calendar({ version: 'v3', auth });
    const event = {
      summary: `Appointment: ${name || 'Client'}`,
      description: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nIssue: ${issue}`,
      start: { dateTime: dateTime, timeZone: 'Asia/Kolkata' },
      end: { dateTime: new Date(new Date(dateTime).getTime() + 30 * 60000).toISOString(), timeZone: 'Asia/Kolkata' },
    };

    const calendarResponse = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      resource: event,
    });

    // 2. क्लाइंट को ईमेल भेजना (Nodemailer से)
    if (email) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER, // तुम्हारी जीमेल आईडी
          pass: process.env.EMAIL_PASS, // नया App Password
        },
      });

      // डेट को पढ़ने लायक फॉर्मेट में बदलना
      const appointmentDate = new Date(dateTime).toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' 
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email, // क्लाइंट का ईमेल जो AI ने पूछा है
        subject: 'Your Appointment Confirmation',
        text: `Hello ${name},\n\nYour appointment has been successfully booked for ${appointmentDate}.\n\nIf you have any questions about your issue (${issue}), please let us know.\n\nThank you!`,
      };

      await transporter.sendMail(mailOptions);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Booking confirmed and Email sent!', 
      link: calendarResponse.data.htmlLink 
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Server Error', details: error.message });
  }
}
