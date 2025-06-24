# menu_viewer.py

import streamlit as st
from auth import require_role, get_user_id
from utils import delete_button
from firebase_init import db
from utils import (
    get_active_event_id,
    get_active_event,
    get_event_by_id,
    format_day_label,
)
from datetime import datetime, timedelta
from event_file import get_event_file, update_event_file_field, initialize_event_file
from recipes import save_menu_to_firestore

MEAL_COLORS = {
    "breakfast": "#fff9c4",
    "lunch": "#d4edda",
    "dinner": "#d1e7ff",
    "after ceremony": "#ffe6f0",
}

DAY_COLORS = {
    "monday": "rgba(255,0,0,0.2)",
    "tuesday": "rgba(255,165,0,0.2)",
    "wednesday": "rgba(255,255,0,0.2)",
    "thursday": "rgba(0,255,0,0.2)",
    "friday": "rgba(0,255,255,0.2)",
    "saturday": "rgba(0,0,255,0.2)",
    "sunday": "rgba(255,0,255,0.2)",
}

# ----------------------------
# 📋 View & Edit Menu (Structured)
# ----------------------------

@require_role("user")
def menu_viewer_ui(event_id=None, key_prefix: str = "", show_headers: bool = True):
    """Display and edit an event menu with scoped widget keys."""
    if show_headers:
        st.title("🍽️ Event Menu")

    if not event_id:
        event_id = get_active_event_id()
    if not event_id:
        st.warning("No active event selected.")
        return

    user_id = get_user_id()

    # Initialize event file if not present
    initialize_event_file(event_id, user_id)

    event_file = get_event_file(event_id)
    menu = event_file.get("menu", [])

    # Build list of selectable dates between event start and end
    active_event = get_event_by_id(event_id) or get_active_event()
    date_options = []
    if active_event and active_event.get("start_date") and active_event.get("end_date"):
        try:
            start = datetime.fromisoformat(active_event["start_date"]).date()
            end = datetime.fromisoformat(active_event["end_date"]).date()
            current = start
            while current <= end:
                iso = current.isoformat()
                date_options.append(iso)
                current += timedelta(days=1)
        except Exception:
            pass

    if show_headers:
        st.markdown("### 🧾 Current Menu")

    updated_menu = list(menu)

    grouped = {}
    for idx, item in enumerate(updated_menu):
        day = item.get("day", "")
        meal = item.get("meal", "")
        grouped.setdefault(day, {}).setdefault(meal, []).append((idx, item))

    for day, meal_map in sorted(grouped.items()):
        day_name = "Unknown"
        try:
            day_name = datetime.fromisoformat(day).strftime("%A")
        except Exception:
            pass
        day_color = DAY_COLORS.get(day_name.lower(), "rgba(0,0,0,0.1)")
        with st.expander(format_day_label(day), expanded=True):
            st.markdown(f"<div style='background-color:{day_color};padding:0.5em;border-radius:8px;'>", unsafe_allow_html=True)
            if delete_button("\U0001F5D1", key=f"del_day_{day}"):
                updated_menu = [m for m in updated_menu if m.get('day') != day]
                update_event_file_field(event_id, 'menu', updated_menu, user_id)
                st.rerun()
            for meal, items in meal_map.items():
                with st.expander(meal.capitalize(), expanded=False):
                    if delete_button("\U0001F5D1", key=f"del_meal_{day}_{meal}"):
                        updated_menu = [m for m in updated_menu if not (m.get('day') == day and m.get('meal') == meal)]
                        update_event_file_field(event_id, 'menu', updated_menu, user_id)
                        st.rerun()
                    for idx, itm in items:
                        color = MEAL_COLORS.get(meal.lower(), "#f0f0f0")
                        with st.expander(itm.get('name', 'Untitled'), expanded=False):
                            st.markdown(f"<div style='background-color:{color};padding:0.5em;border-radius:8px;'>", unsafe_allow_html=True)
                            st.write(itm.get('description', ''))
                            if delete_button("\U0001F5D1", key=f"del_dish_{idx}"):
                                updated_menu.pop(idx)
                                update_event_file_field(event_id, 'menu', updated_menu, user_id)
                                st.rerun()
                            st.markdown("</div>", unsafe_allow_html=True)
            st.markdown("</div>", unsafe_allow_html=True)

    with st.expander("➕ Add New Menu Item", expanded=False):
        form_key = f"{key_prefix}new_menu_item_form"
        with st.form(form_key, clear_on_submit=True):
            # Fetch recipe options for autocomplete dropdown
            recipe_docs = db.collection("recipes").stream()
            recipe_map: dict[str, list[str]] = {}
            for doc in recipe_docs:
                data = doc.to_dict() or {}
                base = data.get("name", "Unnamed Recipe")
                special = data.get("special_version", "").strip()
                recipe_map.setdefault(base, [])
                if special:
                    recipe_map[base].append(special)

            options = []
            for base in sorted(recipe_map.keys()):
                options.append({"label": base, "value": base})
                for sp in recipe_map[base]:
                    options.append({"label": f"   \u21b3 {sp}", "value": f"{base} - {sp}"})

            new_name_choice = st.selectbox(
                "New Dish Name",
                options,
                format_func=lambda x: x["label"],
                key=f"{key_prefix}new_name"
            )
            new_name = new_name_choice["value"]

            col_c, col_d = st.columns(2)
            with col_c:
                new_meal = st.selectbox(
                    "Meal",
                    ["Breakfast", "Lunch", "Dinner", "After Ceremony"],
                    key=f"{key_prefix}new_meal",
                )
            with col_d:
                new_day = st.selectbox(
                    "Date",
                    date_options or [""],
                    format_func=format_day_label,
                    key=f"{key_prefix}new_day",
                )
            new_description = st.text_area("New Description", key=f"{key_prefix}new_desc")

            submitted = st.form_submit_button("Add Menu Item")
            if submitted and new_name.strip():
                updated_menu.append({
                    "name": new_name.strip(),
                    "meal": new_meal,
                    "day": new_day,
                    "description": new_description.strip(),
                    "tags": []
                })
                update_event_file_field(event_id, "menu", updated_menu, user_id)
                st.success(f"✅ Added: {new_name.strip()}")
                st.rerun()




# ----------------------------
# 🔧 Helpers
# ----------------------------

def _get_meal_index(meal: str):
    options = ["Breakfast", "Lunch", "Dinner", "After Ceremony"]
    return options.index(meal) if meal in options else 0



