import { google } from 'googleapis';

export default async function handler(req, res) {
  // सिर्फ POST रिक्वेस्ट को अलाउ करेंगे (ElevenLabs POST ही भेजता है)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  try {
    // ElevenLabs से आने वाला डेटा (नाम, ईमेल, समय)
    const { name, email, dateTime } = req.body; 

    // Google Calendar Authentication
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        // private_key में \n को सही से प्रोसेस करने के लिए
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // मीटिंग की डिटेल्स
    const event = {
      summary: `Appointment with ${name || 'Client'}`,
      description: `Booking made via AI Voice Agent. Client Email: ${email}`,
      start: {
        dateTime: dateTime, // ElevenLabs से आने वाला समय
        timeZone: 'Asia/Kolkata', // अपना टाइमज़ोन
      },
      end: {
        // मीटिंग को 30 मिनट का सेट कर रहे हैं
        dateTime: new Date(new Date(dateTime).getTime() + 30 * 60000).toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      attendees: [
        { email: email } // इस ईमेल पर कन्फर्मेशन जाएगा
      ],
    };

    // कैलेंडर में इवेंट सेव करना और ईमेल भेजना
    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      resource: event,
      sendUpdates: 'all', // यह लाइन जादू है, गूगल खुद ईमेल भेज देगा!
    });

    // सक्सेस मैसेज वापस भेजना
    return res.status(200).json({ 
      success: true, 
      message: 'Booking confirmed and email sent!', 
      link: response.data.htmlLink 
    });

  } catch (error) {
    console.error('Error creating calendar event:', error);
    return res.status(500).json({ error: 'Server Error', details: error.message });
  }
}
