const cron = require('node-cron');
const Reminder = require('../models/Reminder');

// Function to check for due reminders
const checkReminders = async () => {
  try {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);
    
    // Find reminders due in the next 5 minutes
    const dueReminders = await Reminder.find({
      isActive: true,
      reminderDate: {
        $gte: now,
        $lte: fiveMinutesFromNow
      }
    }).populate('user', 'name email');
    
    // Process reminders (in a real app, you would send emails or push notifications here)
    dueReminders.forEach(reminder => {
      console.log(`Reminder due: ${reminder.title} for user ${reminder.user.name}`);
      
      // Here you would implement notification logic
      // For example, sending an email or push notification
      
      // If it's a recurring reminder, update the next reminder date
      if (reminder.isRecurring) {
        updateRecurringReminder(reminder);
      } else {
        // Mark one-time reminder as inactive
        reminder.isActive = false;
        reminder.save();
      }
    });
  } catch (err) {
    console.error('Error checking reminders:', err);
  }
};

// Function to update recurring reminders
const updateRecurringReminder = async (reminder) => {
  try {
    const currentDate = new Date(reminder.reminderDate);
    let newDate;
    
    switch (reminder.recurringPattern) {
      case 'daily':
        newDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
        break;
      case 'weekly':
        newDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
        break;
      case 'monthly':
        newDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
        break;
      case 'yearly':
        newDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1));
        break;
      default:
        return;
    }
    
    reminder.reminderDate = newDate;
    await reminder.save();
  } catch (err) {
    console.error('Error updating recurring reminder:', err);
  }
};

// Schedule the reminder check to run every minute
const startScheduler = () => {
  cron.schedule('* * * * *', checkReminders);
  console.log('Reminder scheduler started');
};

module.exports = { startScheduler };