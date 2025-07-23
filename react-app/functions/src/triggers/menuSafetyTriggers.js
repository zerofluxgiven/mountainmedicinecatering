const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Trigger when a menu is created or updated
exports.onMenuChange = functions.firestore
  .document('menus/{menuId}')
  .onWrite(async (change, context) => {
    const { menuId } = context.params;
    
    try {
      const menuData = change.after.exists ? change.after.data() : null;
      
      if (!menuData || !menuData.event_id) {
        console.log('Menu has no event_id, skipping safety check');
        return;
      }

      // Get event data to check against
      const eventDoc = await admin.firestore()
        .collection('events')
        .doc(menuData.event_id)
        .get();

      if (!eventDoc.exists) {
        console.log('Event not found for menu safety check');
        return;
      }

      const eventData = eventDoc.data();
      
      // Only trigger if there are allergens or dietary restrictions to check
      if (!eventData.allergens?.length && !eventData.dietary_restrictions?.length && !eventData.guests_with_restrictions?.length) {
        console.log('No dietary restrictions to check, skipping safety monitoring');
        return;
      }

      // Create AI monitoring question
      await admin.firestore()
        .collection('ai_monitoring')
        .add({
          type: 'menu_safety_check',
          priority: 'high',
          event_id: menuData.event_id,
          menu_id: menuId,
          question: 'URGENT: Menu has been updated. Please immediately verify ALL recipes are safe for guests with the following restrictions and allergies. Check every ingredient in every recipe.',
          context: {
            trigger: 'menu_change',
            menu_name: menuData.name,
            event_name: eventData.name,
            event_allergens: eventData.allergens || [],
            event_dietary_restrictions: eventData.dietary_restrictions || [],
            guests_with_restrictions: eventData.guests_with_restrictions || [],
            menu_structure: {
              days: menuData.days?.length || 0,
              total_meals: menuData.days?.reduce((total, day) => total + (day.meals?.length || 0), 0) || 0,
              total_courses: menuData.days?.reduce((total, day) => 
                total + (day.meals?.reduce((mealTotal, meal) => mealTotal + (meal.courses?.length || 0), 0) || 0), 0) || 0,
              total_recipes: menuData.days?.reduce((total, day) => 
                total + (day.meals?.reduce((mealTotal, meal) => 
                  mealTotal + (meal.courses?.reduce((courseTotal, course) => 
                    courseTotal + (course.recipes?.length || 1), 0) || 0), 0) || 0), 0) || 0
            },
            check_required: true,
            auto_trigger: true
          },
          status: 'pending',
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });

      console.log(`AI safety check triggered for menu ${menuId} in event ${menuData.event_id}`);

    } catch (error) {
      console.error('Error triggering menu safety check:', error);
    }
  });

// Trigger when event guest data is updated
exports.onEventGuestDataChange = functions.firestore
  .document('events/{eventId}')
  .onUpdate(async (change, context) => {
    const { eventId } = context.params;
    
    try {
      const beforeData = change.before.data();
      const afterData = change.after.data();

      // Check if allergen or dietary restriction data changed
      const allergensChanged = JSON.stringify(beforeData.allergens || []) !== JSON.stringify(afterData.allergens || []);
      const dietaryChanged = JSON.stringify(beforeData.dietary_restrictions || []) !== JSON.stringify(afterData.dietary_restrictions || []);
      const guestsChanged = JSON.stringify(beforeData.guests_with_restrictions || []) !== JSON.stringify(afterData.guests_with_restrictions || []);

      if (!allergensChanged && !dietaryChanged && !guestsChanged) {
        console.log('No dietary/allergy changes detected, skipping safety check');
        return;
      }

      // Get all menus for this event
      const menusSnapshot = await admin.firestore()
        .collection('menus')
        .where('event_id', '==', eventId)
        .get();

      if (menusSnapshot.empty) {
        console.log('No menus found for event, skipping safety check');
        return;
      }

      // Create AI monitoring questions for each menu
      const batch = admin.firestore().batch();
      
      menusSnapshot.forEach(menuDoc => {
        const menuData = menuDoc.data();
        
        const monitoringRef = admin.firestore().collection('ai_monitoring').doc();
        batch.set(monitoringRef, {
          type: 'guest_data_change_review',
          priority: 'high',
          event_id: eventId,
          menu_id: menuDoc.id,
          question: 'CRITICAL: Guest dietary restrictions/allergies have been updated. Please immediately re-verify that ALL recipes in this menu are safe for the updated guest requirements.',
          context: {
            trigger: 'guest_data_change',
            changes: {
              allergens: {
                before: beforeData.allergens || [],
                after: afterData.allergens || []
              },
              dietary_restrictions: {
                before: beforeData.dietary_restrictions || [],
                after: afterData.dietary_restrictions || []
              },
              guests_with_restrictions: {
                before: beforeData.guests_with_restrictions || [],
                after: afterData.guests_with_restrictions || []
              }
            },
            menu_name: menuData.name,
            event_name: afterData.name,
            current_allergens: afterData.allergens || [],
            current_dietary_restrictions: afterData.dietary_restrictions || [],
            current_guests_with_restrictions: afterData.guests_with_restrictions || [],
            requires_immediate_review: true,
            auto_trigger: true
          },
          status: 'pending',
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours - more urgent
        });
      });

      await batch.commit();
      console.log(`AI safety checks triggered for ${menusSnapshot.size} menus due to guest data changes in event ${eventId}`);

    } catch (error) {
      console.error('Error triggering guest data change safety check:', error);
    }
  });

// Trigger when accommodation menus are created
exports.onAccommodationMenuCreate = functions.firestore
  .document('accommodation_menus/{accommodationId}')
  .onCreate(async (snap, context) => {
    const { accommodationId } = context.params;
    
    try {
      const accommodationData = snap.data();
      
      if (!accommodationData.event_id) {
        console.log('Accommodation menu has no event_id, skipping safety check');
        return;
      }

      // Create AI monitoring question for the new accommodation
      await admin.firestore()
        .collection('ai_monitoring')
        .add({
          type: 'accommodation_verification',
          priority: 'high',
          event_id: accommodationData.event_id,
          accommodation_id: accommodationId,
          question: 'VERIFY: New accommodation recipe created. Please confirm this alternative is completely safe for the specified dietary restrictions and does not contain any conflicting allergens.',
          context: {
            trigger: 'accommodation_created',
            accommodation_name: accommodationData.alternative?.name,
            original_course: accommodationData.original_course,
            modifications: accommodationData.alternative?.modifications || [],
            affected_guests: accommodationData.affected_guests || [],
            allergen_conflicts: accommodationData.allergen_conflicts || [],
            dietary_conflicts: accommodationData.dietary_conflicts || [],
            serves: accommodationData.alternative?.serves || 0,
            requires_verification: true,
            auto_trigger: true
          },
          status: 'pending',
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000) // 6 hours - very urgent
        });

      console.log(`AI accommodation verification triggered for ${accommodationId}`);

    } catch (error) {
      console.error('Error triggering accommodation verification:', error);
    }
  });

// Trigger when diet data is created or updated
exports.onDietChange = functions.firestore
  .document('events/{eventId}/diets/{dietId}')
  .onWrite(async (change, context) => {
    const { eventId, dietId } = context.params;
    
    try {
      // Get the diet data
      const dietData = change.after.exists ? change.after.data() : null;
      const isNew = !change.before.exists;
      
      if (!dietData) {
        console.log('Diet deleted, skipping safety check');
        return;
      }
      
      // Get event data
      const eventDoc = await admin.firestore()
        .collection('events')
        .doc(eventId)
        .get();
        
      if (!eventDoc.exists) {
        console.log('Event not found for diet safety check');
        return;
      }
      
      const eventData = eventDoc.data();
      
      // Get all menus for this event
      const menusSnapshot = await admin.firestore()
        .collection('menus')
        .where('event_id', '==', eventId)
        .get();
      
      if (menusSnapshot.empty) {
        console.log('No menus found for event, skipping diet safety check');
        return;
      }
      
      // Create AI monitoring question
      await admin.firestore()
        .collection('ai_monitoring')
        .add({
          type: 'diet_change_review',
          priority: 'high',
          event_id: eventId,
          diet_id: dietId,
          question: isNew 
            ? `NEW DIET ADDED: Guest "${dietData.guest_name}" has dietary requirements. Please immediately verify ALL menus are safe for their restrictions.`
            : `DIET UPDATED: Guest "${dietData.guest_name}" dietary requirements have changed. Please re-verify ALL menus remain safe.`,
          context: {
            trigger: 'diet_change',
            is_new: isNew,
            guest_name: dietData.guest_name,
            diet_types: dietData.diet_types || [],
            custom_diet_names: dietData.custom_diet_names || [],
            restrictions: dietData.restrictions || [],
            diet_name: dietData.diet_name,
            event_name: eventData.name,
            menu_count: menusSnapshot.size,
            requires_immediate_review: true,
            auto_trigger: true
          },
          status: 'pending',
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000) // 6 hours - urgent
        });
      
      console.log(`AI diet safety check triggered for ${isNew ? 'new' : 'updated'} diet ${dietId} in event ${eventId}`);
      
      // Update event dietary restrictions if needed
      const allDietsSnapshot = await admin.firestore()
        .collection('events')
        .doc(eventId)
        .collection('diets')
        .get();
      
      const dietaryRestrictions = new Set();
      allDietsSnapshot.forEach(doc => {
        const diet = doc.data();
        if (diet.diet_types) {
          diet.diet_types.forEach(type => dietaryRestrictions.add(type));
        }
        if (diet.custom_diet_names) {
          diet.custom_diet_names.forEach(name => dietaryRestrictions.add(name));
        }
      });
      
      await admin.firestore()
        .collection('events')
        .doc(eventId)
        .update({
          dietary_restrictions: Array.from(dietaryRestrictions).sort(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      
    } catch (error) {
      console.error('Error triggering diet safety check:', error);
    }
  });

// Daily safety sweep - check all active events
exports.dailySafetySweep = functions.pubsub.schedule('every day 08:00').onRun(async (context) => {
  try {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    // Find all events happening in the next 30 days
    const eventsSnapshot = await admin.firestore()
      .collection('events')
      .where('start_date', '>=', now)
      .where('start_date', '<=', futureDate)
      .get();

    if (eventsSnapshot.empty) {
      console.log('No upcoming events found for daily safety sweep');
      return;
    }

    const batch = admin.firestore().batch();
    let checksCreated = 0;

    for (const eventDoc of eventsSnapshot.docs) {
      const eventData = eventDoc.data();
      const eventId = eventDoc.id;

      // Skip if no dietary restrictions
      if (!eventData.allergens?.length && !eventData.dietary_restrictions?.length) {
        continue;
      }

      // Get menus for this event
      const menusSnapshot = await admin.firestore()
        .collection('menus')
        .where('event_id', '==', eventId)
        .get();

      if (menusSnapshot.empty) {
        continue;
      }

      // Check if we already have a recent daily sweep for this event
      const recentSweepSnapshot = await admin.firestore()
        .collection('ai_monitoring')
        .where('event_id', '==', eventId)
        .where('type', '==', 'daily_safety_sweep')
        .where('created_at', '>=', new Date(now.getTime() - 24 * 60 * 60 * 1000))
        .limit(1)
        .get();

      if (!recentSweepSnapshot.empty) {
        continue; // Already have a recent sweep
      }

      // Create daily safety sweep question
      const monitoringRef = admin.firestore().collection('ai_monitoring').doc();
      batch.set(monitoringRef, {
        type: 'daily_safety_sweep',
        priority: 'medium',
        event_id: eventId,
        question: `Daily Safety Check: Please review all menus for "${eventData.name}" (${eventData.start_date.toDate().toLocaleDateString()}) and confirm they remain safe for all guest dietary restrictions.`,
        context: {
          trigger: 'daily_sweep',
          event_name: eventData.name,
          event_date: eventData.start_date,
          days_until_event: Math.ceil((eventData.start_date.toDate() - now) / (1000 * 60 * 60 * 24)),
          allergens: eventData.allergens || [],
          dietary_restrictions: eventData.dietary_restrictions || [],
          menu_count: menusSnapshot.size,
          routine_check: true,
          auto_trigger: true
        },
        status: 'pending',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
      });

      checksCreated++;
    }

    await batch.commit();
    console.log(`Daily safety sweep completed: ${checksCreated} safety checks created`);

  } catch (error) {
    console.error('Error during daily safety sweep:', error);
  }
});