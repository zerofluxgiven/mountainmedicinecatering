const admin = require("firebase-admin");
const functions = require("firebase-functions");

// Email configuration (would use SendGrid, Mailgun, or similar in production)
// For now, we'll just log the emails and update Firestore

async function sendEventReminder(event) {
  const eventDate = event.event_date?.toDate?.() || new Date(event.event_date);
  const daysUntil = Math.ceil((eventDate - new Date()) / (1000 * 60 * 60 * 24));

  const emailData = {
    to: event.client_email || event.contact_email,
    subject: `Reminder: ${event.name} in ${daysUntil} days`,
    html: generateEventReminderHTML(event, daysUntil),
    text: generateEventReminderText(event, daysUntil),
    type: "event_reminder",
    event_id: event.id,
    sent_at: admin.firestore.FieldValue.serverTimestamp()
  };

  // In production, send actual email here
  // await sendEmail(emailData);

  // Log email to Firestore
  await admin.firestore().collection("email_logs").add(emailData);

  console.log(`Event reminder sent for ${event.name} to ${emailData.to}`);
}

async function sendMenuUpdate(event, menu, changeType) {
  const emailData = {
    to: event.client_email || event.contact_email,
    subject: `Menu ${changeType} for ${event.name}`,
    html: generateMenuUpdateHTML(event, menu, changeType),
    text: generateMenuUpdateText(event, menu, changeType),
    type: "menu_update",
    event_id: event.id,
    menu_id: menu.id,
    change_type: changeType,
    sent_at: admin.firestore.FieldValue.serverTimestamp()
  };

  // In production, send actual email here
  // await sendEmail(emailData);

  // Log email to Firestore
  await admin.firestore().collection("email_logs").add(emailData);

  console.log(`Menu update sent for ${event.name} to ${emailData.to}`);
}

function generateEventReminderHTML(event, daysUntil) {
  const eventDate = event.event_date?.toDate?.() || new Date(event.event_date);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #6B46C1; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Mountain Medicine Catering</h1>
          <h2>Event Reminder</h2>
        </div>
        <div class="content">
          <h3>Your event "${event.name}" is coming up in ${daysUntil} days!</h3>
          
          <div class="details">
            <p><strong>Date:</strong> ${eventDate.toLocaleDateString("en-US", { 
              weekday: "long", 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            })}</p>
            <p><strong>Time:</strong> ${event.start_time || "TBD"}</p>
            <p><strong>Location:</strong> ${event.venue_name || event.location || "TBD"}</p>
            <p><strong>Guest Count:</strong> ${event.guest_count || "TBD"}</p>
          </div>

          ${event.notes ? `
            <div class="details">
              <p><strong>Event Notes:</strong></p>
              <p>${event.notes}</p>
            </div>
          ` : ""}

          <p>If you have any questions or need to make changes, please contact us as soon as possible.</p>
        </div>
        <div class="footer">
          <p>Mountain Medicine Catering<br>
          Exceptional cuisine for your special events</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateEventReminderText(event, daysUntil) {
  const eventDate = event.event_date?.toDate?.() || new Date(event.event_date);
  
  return `
Mountain Medicine Catering - Event Reminder

Your event "${event.name}" is coming up in ${daysUntil} days!

Event Details:
- Date: ${eventDate.toLocaleDateString("en-US", { 
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  })}
- Time: ${event.start_time || "TBD"}
- Location: ${event.venue_name || event.location || "TBD"}
- Guest Count: ${event.guest_count || "TBD"}

${event.notes ? `Notes: ${event.notes}` : ""}

If you have any questions or need to make changes, please contact us as soon as possible.

Mountain Medicine Catering
Exceptional cuisine for your special events
  `.trim();
}

function generateMenuUpdateHTML(event, menu, changeType) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #6B46C1; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .menu-section { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Mountain Medicine Catering</h1>
          <h2>Menu ${changeType === "created" ? "Created" : "Updated"}</h2>
        </div>
        <div class="content">
          <h3>${event.name}</h3>
          <p>The ${menu.type || "menu"} menu has been ${changeType}.</p>
          
          <div class="menu-section">
            <h4>${menu.name}</h4>
            ${menu.sections?.map(section => `
              <h5>${section.name}</h5>
              <ul>
                ${section.items?.map(item => `
                  <li>${item.name}${item.notes ? ` - ${item.notes}` : ""}</li>
                `).join("")}
              </ul>
            `).join("")}
          </div>

          <p>Please review the menu and let us know if you have any questions or would like to make changes.</p>
        </div>
        <div class="footer">
          <p>Mountain Medicine Catering<br>
          Exceptional cuisine for your special events</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateMenuUpdateText(event, menu, changeType) {
  let menuContent = `${menu.name}\n`;
  
  menu.sections?.forEach(section => {
    menuContent += `\n${section.name}:\n`;
    section.items?.forEach(item => {
      menuContent += `- ${item.name}${item.notes ? ` (${item.notes})` : ""}\n`;
    });
  });

  return `
Mountain Medicine Catering - Menu ${changeType === "created" ? "Created" : "Updated"}

Event: ${event.name}

The ${menu.type || "menu"} menu has been ${changeType}.

${menuContent}

Please review the menu and let us know if you have any questions or would like to make changes.

Mountain Medicine Catering
Exceptional cuisine for your special events
  `.trim();
}

// Utility function for sending emails (would integrate with email service)
async function sendEmail(emailData) {
  // In production, integrate with SendGrid, Mailgun, or similar
  // Example with SendGrid:
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(functions.config().sendgrid.key);
  
  const msg = {
    to: emailData.to,
    from: 'noreply@mountainmedicinecatering.com',
    subject: emailData.subject,
    text: emailData.text,
    html: emailData.html,
  };
  
  await sgMail.send(msg);
  */
  
  // For now, just log
  console.log("Email would be sent:", {
    to: emailData.to,
    subject: emailData.subject
  });
}

module.exports = {
  sendEventReminder,
  sendMenuUpdate
};