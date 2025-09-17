const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const sendWhatsApp = async (msg) => {
  await client.messages.create({
    body: msg,
    from: 'whatsapp:+14155238886',
    to: `whatsapp:+91${process.env.ADMIN_PHONE}`,
  });
};

module.exports = sendWhatsApp;
