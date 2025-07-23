import React from 'react';
import { useParams } from 'react-router-dom';
import MenuPlannerCalendar from '../../components/Menu/MenuPlannerCalendar';

export default function MenuPlanner() {
  const { eventId, menuId } = useParams();

  if (!eventId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Event Required</h2>
        <p>Menu planning requires an event context. Please select an event first.</p>
      </div>
    );
  }

  return (
    <MenuPlannerCalendar 
      eventId={eventId} 
      menuId={menuId || 'new'}
      onMenuChange={(newMenuId) => {
        // Update URL if needed
        if (menuId === 'new' && newMenuId) {
          window.history.replaceState(null, '', `/events/${eventId}/menus/${newMenuId}/plan`);
        }
      }}
    />
  );
}