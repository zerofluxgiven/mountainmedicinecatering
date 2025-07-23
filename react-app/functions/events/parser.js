const pdfParse = require('pdf-parse');
const fetch = require('node-fetch');
const { uploadEventImage } = require('../services/storageService');

// Parse event details from various file types using AI
async function parseEventFromFile(fileBuffer, mimeType, openai, eventId = null) {
  let extractedText = '';
  
  try {
    // Extract text based on file type
    if (mimeType.includes('image')) {
      // Use OpenAI Vision API directly for images
      const base64Image = fileBuffer.toString('base64');
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all text from this event flyer/invitation image. Include all dates, times, locations, and contact information."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      });
      extractedText = response.choices[0].message.content;
    } else if (mimeType === 'application/pdf') {
      // Parse PDF to extract text
      const pdfData = await pdfParse(fileBuffer);
      extractedText = pdfData.text;
    } else {
      // For text files, convert buffer to string
      extractedText = fileBuffer.toString('utf-8');
    }
    
    if (!extractedText) {
      throw new Error('No text could be extracted from the file');
    }
    
    // Use OpenAI to parse event details
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting event information from flyers and invitations. 
Extract the following details from the provided text:
- Event name/title
- Date (format as YYYY-MM-DD)
- Start time
- End time (if available)
- Venue/location name
- Full address
- Guest count or capacity
- Website URL
- Contact email
- Contact phone
- Event description
- Event type (wedding, corporate, birthday, etc.)
- Dress code (if mentioned)
- RSVP deadline (if mentioned)

Return the information as a JSON object. If a field is not found, use null.
Be smart about parsing dates - convert any date format to YYYY-MM-DD.
For times, use 24-hour format (HH:MM).`
        },
        {
          role: "user",
          content: extractedText
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    
    const parsedData = JSON.parse(completion.choices[0].message.content);
    
    // Upload image if it's an image file and we have an eventId
    let event_images = [];
    if (mimeType.includes('image') && eventId) {
      try {
        const imageUrl = await uploadEventImage(fileBuffer, eventId, mimeType);
        event_images = [imageUrl];
      } catch (error) {
        console.error('Failed to upload event image:', error);
        // Continue without the image
      }
    }
    
    // Map to our event model
    return {
      name: parsedData.event_name || parsedData.title || '',
      event_date: parsedData.date || parsedData.event_date || '',
      start_time: parsedData.start_time || '',
      end_time: parsedData.end_time || '',
      venue: parsedData.venue || parsedData.location_name || '',
      venue_address: parsedData.address || parsedData.full_address || '',
      guest_count: parsedData.guest_count || parsedData.capacity || 0,
      website: parsedData.website || parsedData.url || '',
      contact_email: parsedData.contact_email || parsedData.email || '',
      contact_phone: parsedData.contact_phone || parsedData.phone || '',
      description: parsedData.description || parsedData.event_description || '',
      event_type: parsedData.event_type || '',
      dress_code: parsedData.dress_code || '',
      rsvp_deadline: parsedData.rsvp_deadline || '',
      event_images: event_images,
      // Include raw extracted text for reference
      raw_text: extractedText.substring(0, 5000) // Limit to 5000 chars
    };
    
  } catch (error) {
    console.error('Error parsing event file:', error);
    throw error;
  }
}

// Parse event from URL (for online flyers)
async function parseEventFromURL(url, openai) {
  try {
    // Fetch the URL content
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    const buffer = await response.buffer();
    
    // Parse based on content type
    return parseEventFromFile(buffer, contentType, openai);
    
  } catch (error) {
    console.error('Error parsing event from URL:', error);
    throw error;
  }
}

module.exports = {
  parseEventFromFile,
  parseEventFromURL
};