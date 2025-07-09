const SYSTEM_PROMPT = `You are an AI assistant for Mountain Medicine Catering, a professional catering service. 
You help with menu planning, recipe suggestions, dietary accommodations, event planning, and ingredient management.

Key capabilities:
- Suggest menus based on event type, guest count, and preferences
- Help scale recipes for different serving sizes
- Provide allergen-free alternatives and substitutions
- Create shopping lists and prep timelines
- Offer seasonal and locally-sourced suggestions
- Help with pricing and portion calculations

Always be helpful, professional, and specific in your recommendations. When discussing recipes or menus, 
consider dietary restrictions, seasonal availability, and practical preparation constraints.`;

async function handleChatMessage(message, conversationId, eventContext, userId, openai, admin) {
  try {
    // Build conversation context
    const context = await buildConversationContext(conversationId, eventContext, admin);
    
    // Get recent conversation history
    const history = await getConversationHistory(conversationId, admin);
    
    // Prepare messages for OpenAI
    const messages = [
      { role: "system", content: SYSTEM_PROMPT + "\n\nCurrent context:\n" + JSON.stringify(context, null, 2) },
      ...history,
      { role: "user", content: message }
    ];

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: false
    });

    const aiResponse = completion.choices[0].message.content;

    // Save the conversation
    await saveConversationTurn(conversationId, userId, message, aiResponse, admin);

    return aiResponse;
  } catch (error) {
    console.error("Error in handleChatMessage:", error);
    throw error;
  }
}

async function buildConversationContext(conversationId, eventContext, admin) {
  const context = {
    timestamp: new Date().toISOString(),
    ...eventContext
  };

  // If there's a selected event, get more details
  if (eventContext?.selectedEventId) {
    try {
      const eventDoc = await admin.firestore()
        .collection("events")
        .doc(eventContext.selectedEventId)
        .get();
      
      if (eventDoc.exists) {
        const eventData = eventDoc.data();
        context.selectedEvent = {
          name: eventData.name,
          date: eventData.event_date,
          guestCount: eventData.guest_count,
          eventType: eventData.event_type,
          allergens: eventData.allergens || []
        };

        // Get menus for this event
        const menusSnapshot = await admin.firestore()
          .collection("menus")
          .where("event_id", "==", eventContext.selectedEventId)
          .get();
        
        context.eventMenus = menusSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          type: doc.data().type,
          sections: doc.data().sections?.length || 0
        }));
      }
    } catch (error) {
      console.error("Error fetching event context:", error);
    }
  }

  return context;
}

async function getConversationHistory(conversationId, admin, limit = 10) {
  if (!conversationId) return [];

  try {
    const messagesSnapshot = await admin.firestore()
      .collection("conversations")
      .doc(conversationId)
      .collection("messages")
      .orderBy("timestamp", "desc")
      .limit(limit * 2) // Get more to ensure we have enough after filtering
      .get();

    const messages = [];
    messagesSnapshot.docs.reverse().forEach(doc => {
      const data = doc.data();
      if (data.role && data.content) {
        messages.push({
          role: data.role,
          content: data.content
        });
      }
    });

    // Return last N messages to stay within token limits
    return messages.slice(-limit);
  } catch (error) {
    console.error("Error fetching conversation history:", error);
    return [];
  }
}

async function saveConversationTurn(conversationId, userId, userMessage, aiResponse, admin) {
  if (!conversationId) return;

  const batch = admin.firestore().batch();
  const conversationRef = admin.firestore().collection("conversations").doc(conversationId);
  
  // Update conversation metadata
  batch.update(conversationRef, {
    lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
    messageCount: admin.firestore.FieldValue.increment(2)
  });

  // Add user message
  const userMessageRef = conversationRef.collection("messages").doc();
  batch.set(userMessageRef, {
    role: "user",
    content: userMessage,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    userId: userId
  });

  // Add AI response
  const aiMessageRef = conversationRef.collection("messages").doc();
  batch.set(aiMessageRef, {
    role: "assistant",
    content: aiResponse,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  await batch.commit();
}

// Helper function to generate contextual responses
function generateContextualSuggestions(context) {
  const suggestions = [];

  if (context.selectedEvent) {
    const { guestCount, eventType, allergens } = context.selectedEvent;
    
    if (guestCount) {
      suggestions.push(`For ${guestCount} guests, I recommend planning for:`);
      suggestions.push(`- ${Math.ceil(guestCount * 1.5)} appetizer portions per person`);
      suggestions.push(`- ${guestCount * 1.2} main course servings (to ensure enough)`);
    }

    if (allergens && allergens.length > 0) {
      suggestions.push(`Remember to accommodate these allergens: ${allergens.join(", ")}`);
    }

    if (eventType) {
      const typesSuggestions = {
        wedding: "Elegant plated dinners or buffet stations work well for weddings",
        corporate: "Consider dietary variety and professional presentation for corporate events",
        birthday: "Fun, interactive food stations are popular for birthday celebrations",
        cocktail: "Focus on easy-to-eat finger foods and small plates for cocktail parties"
      };
      
      if (typesSuggestions[eventType]) {
        suggestions.push(typesSuggestions[eventType]);
      }
    }
  }

  return suggestions;
}

module.exports = {
  handleChatMessage
};