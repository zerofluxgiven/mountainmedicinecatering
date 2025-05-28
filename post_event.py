# post_event.py

import streamlit as st
from firebase_init import db
from auth import require_role
from utils import format_date, get_scoped_query, is_event_scoped, get_event_scope_message, get_active_event_id
from datetime import datetime
from google.cloud.firestore_v1.base_query import FieldFilter

db = db

# ----------------------------
# 📋 Post-Event Interview
# ----------------------------

@require_role("manager")
def post_event_ui(user: dict) -> None:
    """Displays the post-event survey with proper event scoping."""
    st.title("📋 Post-Event Interview")
    
    # Show current scope
    st.info(get_event_scope_message())
    
    # Get completed events
    if is_event_scoped():
        # Check if the active event is complete
        active_event_id = get_active_event_id()
        event_doc = db.collection("events").document(active_event_id).get()
        
        if not event_doc.exists:
            st.error("Active event not found")
            return
            
        event_data = event_doc.to_dict()
        
        if event_data.get("status") != "complete":
            st.warning("Post-event feedback is only available for completed events. Please complete the event first.")
            return
        
        # Show feedback form for the active event
        _render_post_event_form(active_event_id, event_data, user)
    
    else:
        # Show list of completed events to review
        _show_completed_events_list(user)

def _show_completed_events_list(user: dict) -> None:
    """Show list of completed events that need post-event review"""
    st.subheader("Select a Completed Event to Review")
    
    # Get all completed events
    try:
        completed_events = db.collection("events").where(filter=FieldFilter("status", "==", "complete")).where(filter=FieldFilter("deleted", "==", False)).stream()
        events_list = [doc.to_dict() | {"id": doc.id} for doc in completed_events]
    except:
        events_list = []
    
    if not events_list:
        st.info("No completed events found. Complete an event first to provide post-event feedback.")
        return
    
    # Separate events with and without feedback
    events_with_feedback = []
    events_without_feedback = []
    
    for event in events_list:
        if event.get("post_event_summary"):
            events_with_feedback.append(event)
        else:
            events_without_feedback.append(event)
    
    # Show events needing feedback first
    if events_without_feedback:
        st.markdown("### 🔴 Events Needing Feedback")
        for event in events_without_feedback:
            with st.expander(f"{event.get('name', 'Unnamed')} - {format_date(event.get('end_date'))}"):
                st.write(f"**Location:** {event.get('location', 'Unknown')}")
                st.write(f"**Guests:** {event.get('guest_count', 0)}")
                
                if st.button(f"Provide Feedback", key=f"feedback_{event['id']}"):
                    st.session_state["post_event_selected"] = event['id']
                    st.rerun()
    
    # Show events with existing feedback
    if events_with_feedback:
        st.markdown("### ✅ Events with Feedback")
        for event in events_with_feedback:
            with st.expander(f"{event.get('name', 'Unnamed')} - {format_date(event.get('end_date'))}"):
                st.write(f"**Location:** {event.get('location', 'Unknown')}")
                st.write(f"**Guests:** {event.get('guest_count', 0)}")
                
                summary = event.get('post_event_summary', {})
                st.write(f"**Feedback provided by:** {summary.get('completed_by', 'Unknown')}")
                st.write(f"**Date:** {format_date(summary.get('completed_at'))}")
                
                col1, col2 = st.columns(2)
                with col1:
                    if st.button(f"View/Edit Feedback", key=f"edit_{event['id']}"):
                        st.session_state["post_event_selected"] = event['id']
                        st.rerun()
                
                with col2:
                    if st.button(f"📄 Download PDF", key=f"pdf_{event['id']}"):
                        from pdf_export import generate_event_summary_pdf
                        generate_event_summary_pdf(event['id'])
    
    # Check if an event was selected
    if "post_event_selected" in st.session_state:
        selected_id = st.session_state["post_event_selected"]
        selected_doc = db.collection("events").document(selected_id).get()
        
        if selected_doc.exists:
            st.markdown("---")
            _render_post_event_form(selected_id, selected_doc.to_dict(), user)

def _render_post_event_form(event_id: str, event_data: dict, user: dict) -> None:
    """Render the post-event feedback form"""
    st.markdown(f"## Feedback for: {event_data.get('name', 'Unnamed Event')}")
    st.caption(f"Event Date: {format_date(event_data.get('end_date'))} | Location: {event_data.get('location', 'Unknown')}")
    
    # Get existing summary if any
    existing_summary = event_data.get("post_event_summary", {})
    
    # Create form
    with st.form("post_event_form"):
        # Menu Popularity Ratings
        st.markdown("### 🍽️ Menu Popularity")
        st.caption("Rate each menu item from 1 (poor) to 5 (excellent)")
        
        menus = db.collection("menus").where("event_id", "==", event_id).stream()
        menu_popularity = {}
        
        for menu in menus:
            m = menu.to_dict()
            existing_rating = existing_summary.get("menu_popularity", {}).get(m["id"], 3)
            rating = st.slider(
                f"{m.get('name', 'Unnamed Item')} ({m.get('category', 'Unknown')})",
                1, 5, existing_rating,
                key=f"rating_{m['id']}"
            )
            menu_popularity[m["id"]] = rating
        
        # Feedback Sections
        st.markdown("### 🥡 Leftovers or Overages")
        leftovers_notes = st.text_area(
            "Notes on leftover food, overages, or waste:",
            value=existing_summary.get("leftovers_notes", ""),
            help="What items had too much? What ran out? Estimate quantities if possible."
        )
        
        st.markdown("### ⏱️ Timing Issues")
        timing_issues = st.text_area(
            "Notes about prep or service timing:",
            value=existing_summary.get("timing_issues", ""),
            help="What took longer than expected? What could be prepped earlier?"
        )
        
        st.markdown("### 🛠️ Issues & Improvements")
        improvements = st.text_area(
            "Problems encountered and ideas for improvement:",
            value=existing_summary.get("improvements", ""),
            help="Equipment issues, workflow problems, or process improvements"
        )
        
        st.markdown("### 🧾 Forgotten or Missing Items")
        forgotten_items = st.text_area(
            "Items that were forgotten or should be added next time:",
            value=existing_summary.get("forgotten_items", ""),
            help="What did you wish you had? What was missing from lists?"
        )
        
        st.markdown("### 💰 Financial Summary")
        col1, col2 = st.columns(2)
        with col1:
            total_cost = st.number_input(
                "Total Event Cost ($)",
                min_value=0.0,
                value=float(existing_summary.get("total_cost", 0.0)),
                step=10.0
            )
        with col2:
            cost_per_person = total_cost / event_data.get("guest_count", 1) if event_data.get("guest_count", 0) > 0 else 0
            st.metric("Cost Per Person", f"${cost_per_person:.2f}")
        
        st.markdown("### ⭐ Overall Rating")
        overall_rating = st.select_slider(
            "How would you rate the overall event execution?",
            options=["Poor", "Fair", "Good", "Very Good", "Excellent"],
            value=existing_summary.get("overall_rating", "Good")
        )
        
        # Additional notes
        st.markdown("### 📝 Additional Notes")
        additional_notes = st.text_area(
            "Any other observations or notes:",
            value=existing_summary.get("additional_notes", ""),
            help="Weather issues, guest feedback, special moments, etc."
        )
        
        # Submit button
        submitted = st.form_submit_button("💾 Save Post-Event Summary", type="primary")
        
        if submitted:
            try:
                # Prepare summary data
                summary_data = {
                    "menu_popularity": menu_popularity,
                    "leftovers_notes": leftovers_notes,
                    "timing_issues": timing_issues,
                    "improvements": improvements,
                    "forgotten_items": forgotten_items,
                    "total_cost": total_cost,
                    "overall_rating": overall_rating,
                    "additional_notes": additional_notes,
                    "completed_by": user["id"],
                    "completed_at": datetime.utcnow(),
                }
                
                # Update event document
                db.collection("events").document(event_id).update({
                    "post_event_summary": summary_data
                })
                
                st.success("✅ Post-event summary saved successfully!")
                
                # Generate PDF
                col1, col2 = st.columns(2)
                with col1:
                    if st.button("📄 Generate PDF Summary"):
                        from pdf_export import generate_event_summary_pdf
                        generate_event_summary_pdf(event_id)
                
                with col2:
                    if st.button("🔄 Continue to Another Event"):
                        if "post_event_selected" in st.session_state:
                            del st.session_state["post_event_selected"]
                        st.rerun()
                
            except Exception as e:
                st.error(f"❌ Failed to save post-event summary: {e}")

# ----------------------------
# 📊 Post-Event Analytics
# ----------------------------

def show_post_event_analytics():
    """Show analytics across all post-event summaries"""
    st.subheader("📊 Post-Event Analytics")
    
    # Get all events with post-event summaries
    try:
        events_with_feedback = []
        all_events = db.collection("events").where("deleted", "==", False).stream()
        
        for event_doc in all_events:
            event_data = event_doc.to_dict()
            if event_data.get("post_event_summary"):
                events_with_feedback.append(event_data)
        
        if not events_with_feedback:
            st.info("No post-event feedback available yet.")
            return
        
        # Calculate metrics
        total_events = len(events_with_feedback)
        
        # Average costs
        total_costs = [e.get("post_event_summary", {}).get("total_cost", 0) for e in events_with_feedback]
        avg_cost = sum(total_costs) / len(total_costs) if total_costs else 0
        
        # Overall ratings distribution
        ratings = [e.get("post_event_summary", {}).get("overall_rating", "Good") for e in events_with_feedback]
        rating_counts = {}
        for rating in ratings:
            rating_counts[rating] = rating_counts.get(rating, 0) + 1
        
        # Display metrics
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric("Events Reviewed", total_events)
        
        with col2:
            st.metric("Average Event Cost", f"${avg_cost:,.2f}")
        
        with col3:
            most_common_rating = max(rating_counts.items(), key=lambda x: x[1])[0] if rating_counts else "N/A"
            st.metric("Most Common Rating", most_common_rating)
        
        # Show rating distribution
        if rating_counts:
            st.markdown("#### Rating Distribution")
            for rating in ["Poor", "Fair", "Good", "Very Good", "Excellent"]:
                count = rating_counts.get(rating, 0)
                percentage = (count / total_events) * 100 if total_events > 0 else 0
                st.write(f"**{rating}:** {count} events ({percentage:.1f}%)")
        
        # Common issues
        st.markdown("#### Common Issues Mentioned")
        all_issues = []
        for event in events_with_feedback:
            summary = event.get("post_event_summary", {})
            if summary.get("improvements"):
                all_issues.append(summary["improvements"])
            if summary.get("timing_issues"):
                all_issues.append(summary["timing_issues"])
        
        if all_issues:
            # This could be enhanced with text analysis
            st.info(f"Found {len(all_issues)} improvement notes across all events")
        
    except Exception as e:
        st.error(f"Could not load analytics: {e}")