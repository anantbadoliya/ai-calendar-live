import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  try {
    // ElevenLabs agent kis din ka time check karna chahta hai (e.g., "2026-10-06")
    const { date } = req.body; 

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Agent jo date dega, uske subah 00:00 se raat 23:59 tak ka time check karenge
    const timeMin = new Date(date);
    timeMin.setHours(0, 0, 0, 0);
    
    const timeMax = new Date(date);
    timeMax.setHours(23, 59, 59, 999);

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        timeZone: 'Asia/Kolkata', // Tumhara timezone
        items: [{ id: process.env.GOOGLE_CALENDAR_ID }],
      },
    });

    const busySlots = response.data.calendars[process.env.GOOGLE_CALENDAR_ID].busy;

    // Agar koi busy slot nahi hai
    if (!busySlots || busySlots.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: "This day is completely free. You can book at any time.",
        busySlots: []
      });
    }

    // Agar busy slots hain, toh agent ko list bhej do
    return res.status(200).json({ 
      success: true, 
      message: "Here are the busy slots for this day. Do not book during these times. Suggest alternative times to the user.", 
      busySlots: busySlots 
    });

  } catch (error) {
    console.error('Error checking availability:', error);
    return res.status(500).json({ error: 'Server Error', details: error.message });
  }
}
