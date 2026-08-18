const cron = require('node-cron');
const Anniversary = require('../models/Anniversary');
const sendWhatsApp = require('../utils/sendWhatsApp');

const runReminderCron = () => {
  // Run every day at 9 AM
  cron.schedule('0 9 * * *', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    const allAnniversaries = await Anniversary.find();

    for (let anniversary of allAnniversaries) {
      // Check for anniversary date
      await checkAndSendReminder({
        date: anniversary.anniversaryDate,
        today,
        anniversary,
        type: 'Anniversary',
        getMessage: (years, formattedDate) => 
          `🎉 [${anniversary.clientName}'s Business Anniversary]\n` +
          `${anniversary.businessName} will complete ${years} year${years > 1 ? 's' : ''} ` +
          `on ${formattedDate}. Congratulations!`
      });

      // Check for client birthday
      await checkAndSendReminder({
        date: anniversary.clientBirthday,
        today,
        anniversary,
        type: 'Birthday',
        getMessage: (years, formattedDate) =>
          `🎂 [Birthday Reminder]\n` +
          `Don't forget to wish ${anniversary.clientName} ` +
          `a happy birthday on ${formattedDate}!`
      });

      // Check for collaboration anniversary
      await checkAndSendReminder({
        date: anniversary.collaborationDate,
        today,
        anniversary,
        type: 'Collaboration',
        getMessage: (years, formattedDate) =>
          `🤝 [Collaboration Anniversary]\n` +
          `You've been working with ${anniversary.clientName} ` +
          `since ${formattedDate} (${years} year${years > 1 ? 's' : ''}). ` +
          `Time to celebrate this partnership!`
      });
    }
  });
};

async function checkAndSendReminder({ date, today, anniversary, type, getMessage }) {
  const eventDate = new Date(date);
  eventDate.setFullYear(today.getFullYear());

  const diffTime = eventDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Send reminders 7 days and 1 day before the event
  if (diffDays === 7 || diffDays === 1) {
    const years = today.getFullYear() - new Date(date).getFullYear();
    const formattedDate = eventDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });

    const alreadySent = anniversary.lastSentDates.some(sent => {
      const sentDate = new Date(sent);
      return (
        sentDate.toDateString() === today.toDateString() &&
        sentDate.getHours() >= 9 // Only check if sent after 9 AM
      );
    });

    if (!alreadySent) {
      const message = getMessage(years, formattedDate);
      await sendWhatsApp(message);
      
      anniversary.lastSentDates.push(new Date());
      await anniversary.save();
      
      console.log(`Sent ${type} reminder for ${anniversary.clientName}`);
    }
  }
}

module.exports = runReminderCron;