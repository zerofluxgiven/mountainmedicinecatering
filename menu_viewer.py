# menu_viewer.py

import streamlit as st
from auth import require_role, get_user_id
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

    updated_menu = []
    for i, item in enumerate(menu):
        bg_color = MEAL_COLORS.get(item.get("meal", "").lower(), "#f0f0f0")
        with st.expander(f"{item.get('name', 'Untitled Dish')}", expanded=False):
            st.markdown(
                f"<div style='background-color:{bg_color};padding:1em;border-radius:8px;'>",
                unsafe_allow_html=True,
            )
            name = st.text_input(
                f"Dish Name #{i+1}",
                item.get("name", ""),
                key=f"{key_prefix}name_{i}"
            )
            col_a, col_b = st.columns(2)
            with col_a:
                meal = st.selectbox(
                    f"Meal #{i+1}",
                    ["Breakfast", "Lunch", "Dinner", "After Ceremony"],
                    index=_get_meal_index(item.get("meal")),
                    key=f"{key_prefix}meal_{i}"
                )
            with col_b:
                day = st.selectbox(
                    f"Date #{i+1}",
                    date_options or [""],
                    format_func=format_day_label,
                    index=date_options.index(item.get("day")) if item.get("day") in date_options else 0,
                    key=f"{key_prefix}day_{i}"
                )
            description = st.text_area(
                f"Description #{i+1}",
                item.get("description", ""),
                key=f"{key_prefix}desc_{i}"
            )
            tags = st.text_input(
                f"Tags #{i+1} (comma-separated)",
                ", ".join(item.get("tags", [])),
                key=f"{key_prefix}tags_{i}"
            )
            delete_col, _ = st.columns([1, 6])
            delete_clicked = False
            with delete_col:
                if st.button("\U0001F5D1", key=f"{key_prefix}del_{i}"):
                    delete_clicked = True
            if not delete_clicked:
                updated_menu.append({
                    "name": name.strip(),
                    "meal": meal,
                    "day": day,
                    "description": description.strip(),
                    "tags": [t.strip() for t in tags.split(",") if t.strip()]
                })
            st.markdown("</div>", unsafe_allow_html=True)

    # Persist edits to existing items on each interaction
    if updated_menu != menu:
        update_event_file_field(event_id, "menu", updated_menu, user_id)

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

    # ----- Collapsible view -----
    st.markdown("### 👀 View Menu")

    grouped = {}
    for idx, item in enumerate(updated_menu):
        day = item.get("day", "")
        meal = item.get("meal", "")
        grouped.setdefault(day, {}).setdefault(meal, []).append((idx, item))

    for day, meal_map in sorted(grouped.items()):
        with st.expander(format_day_label(day), expanded=False):
            if st.button("\U0001F5D1", key=f"del_day_{day}"):
                updated_menu = [m for m in updated_menu if m.get("day") != day]
                update_event_file_field(event_id, "menu", updated_menu, user_id)
                st.rerun()
            for meal, items in meal_map.items():
                with st.expander(meal.capitalize(), expanded=False):
                    if st.button("\U0001F5D1", key=f"del_meal_{day}_{meal}"):
                        updated_menu = [m for m in updated_menu if not (m.get("day") == day and m.get("meal") == meal)]
                        update_event_file_field(event_id, "menu", updated_menu, user_id)
                        st.rerun()
                    for idx, itm in items:
                        color = MEAL_COLORS.get(meal.lower(), "#f0f0f0")
                        with st.expander(itm.get("name", "Untitled"), expanded=False):
                            st.markdown(
                                f"<div style='background-color:{color};padding:0.5em;border-radius:8px;'>",
                                unsafe_allow_html=True,
                            )
                            st.write(itm.get("description", ""))
                            if st.button("\U0001F5D1", key=f"del_dish_{idx}"):
                                updated_menu.pop(idx)
                                update_event_file_field(event_id, "menu", updated_menu, user_id)
                                st.rerun()
                            st.markdown("</div>", unsafe_allow_html=True)



# ----------------------------
# 🔧 Helpers
# ----------------------------

def _get_meal_index(meal: str):
    options = ["Breakfast", "Lunch", "Dinner", "After Ceremony"]
    return options.index(meal) if meal in options else 0



