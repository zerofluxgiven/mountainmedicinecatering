from event_file import update_event_file_field

# ----------------------------
# 💾 Save Structured Menu to Firestore
# ----------------------------

def save_menu_to_firestore(menu_data: list, event_id: str, user_id: str) -> bool:
    """
    Save structured menu data to the event's event_file in Firestore.
    This overwrites the current menu field.
    """
    try:
        update_event_file_field(event_id, "menu", menu_data, user_id)
        return True
    except Exception as e:
        print("Error saving menu:", e)
        return False
