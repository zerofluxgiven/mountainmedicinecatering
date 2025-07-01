# Repository Index

## All Files

- .devcontainer/devcontainer.json
- .firebaserc
- .github/workflows/firebase-hosting-merge.yml
- .github/workflows/firebase-hosting-pull-request.yml
- .gitignore
- .streamlit/config.toml
- .streamlit/secrets.toml
- README.md
- admin_utilities.py
- ai_chat.py
- ai_parsing_engine.py
- allergies.py
- app.py
- audit.py
- auth.py
- bulk_suggestions.py
- dashboard.py
- event_file.py
- event_mode.py
- event_modifications.py
- event_planning_dashboard.py
- events.py
- file_storage.py
- firebase.json
- firebase_init.py
- firestore_utils.py
- historical_menus.py
- ingredients.py
- ingredients_editor.py
- landing.py
- layout.py
- menu.txt
- menu_editor.py
- menu_viewer.py
- menus.py
- mobile_components.py
- mobile_helpers.py
- mobile_layout.py
- mountain_logo.png
- mountain_logo_banner.png
- notifications.py
- packages.txt
- packing.py
- pdf_export.py
- post_event.py
- public/404.html
- public/index.html
- public/mountain_logo.png
- public/mountain_logo_banner.png
- public/redirect.html
- receipts.py
- recipe_viewer.py
- recipes.py
- recipes_editor.py
- requirements.txt
- roles.py
- shopping_lists.py
- suggestions.py
- tag_explorer.py
- tag_utils.py
- theme.css
- ui_components.py
- upload.py
- upload_integration.py
- user_session_initializer.py
- utils.py

## Functions by File

## admin_utilities.py
- admin_utilities_ui
- _admin_dashboard
- _audit_log_viewer
- _cleanup_tools
- _archive_event_tool
- get_system_stats

## ai_chat.py
- ai_chat_ui
- get_openai_response
- handle_quick_action
- build_context
- extract_actions
- handle_ai_action
- save_ai_shopping_list
- log_conversation
- show_ai_usage_analytics

## ai_parsing_engine.py
- clean_raw_text
- is_meaningful_recipe
- parse_file
- extract_text
- extract_text_from_pdf
- extract_text_from_image
- extract_text_from_csv
- extract_text_from_docx
- extract_image_from_pdf
- extract_image_from_docx_file
- extract_image_from_file
- extract_image_from_soup
- query_ai_parser
- parse_recipe_from_url
- parse_recipe_from_file
- render_extraction_buttons

## allergies.py
- add_allergy_to_event
- get_event_allergies
- update_allergy
- delete_allergy
- _update_ingredient_allergen_info
- _remove_ingredient_allergen_info
- check_recipe_for_allergies
- get_safe_recipes_for_event
- allergy_management_ui
- _view_allergies_tab
- _add_allergy_tab
- _check_recipes_tab
- render_allergy_warning
- get_allergy_analytics
- _get_severity_breakdown

## app.py
- enforce_session_expiry
- initialize_event_mode_state
- handle_auth
- validate_tab_state
- main
- render_admin_panel

## audit.py
- get_audit_logs
- audit_log_ui

## auth.py
- is_logged_in
- get_user
- get_user_id
- get_user_role
- get_current_user
- require_login
- require_role
- authenticate_user
- enrich_session_from_token
- sync_firebase_users
- delete_firebase_user
- decorator
- wrapper

## bulk_suggestions.py
- bulk_suggestions_ui

## dashboard.py
- render_dashboard

## event_file.py
- get_default_event_file
- generate_menu_template
- initialize_event_file
- update_event_file_field
- overwrite_event_file
- get_event_file

## event_mode.py
- is_event_mode_active
- is_locked
- get_scoped_event_id
- get_event_context

## event_modifications.py
- event_modifications_ui
- _apply_suggestion
- _reject_suggestion

## event_planning_dashboard.py
- get_event_data
- save_event_data
- event_planning_dashboard_ui
- _render_quick_menu_form
- _render_shopping_list_editor
- _render_equipment_list_editor
- _render_task_list_editor
- _render_allergies_section
- _render_file_upload_section
- _render_ai_suggestions
- event_planning_dashboard

## events.py
- save_user_event_preference
- get_all_events
- activate_event
- deactivate_event_mode
- complete_event_and_end_sessions
- create_event
- update_event
- delete_event
- get_upcoming_events
- render_create_event_section
- _render_event_details
- event_ui
- show_event_statistics
- render_event_filters
- filter_events
- enhanced_event_ui
- get_active_event
- _parse_date

## file_storage.py
- file_manager_ui
- show_file_analytics
- save_uploaded_file
- link_file_to_entity
- show_link_editor_ui
- _render_parsed_data_editor
- _render_save_as_options

## firebase_init.py
- get_db
- get_bucket

## firestore_utils.py
- batch_update
- get_doc_safe

## historical_menus.py
- historical_menus_ui

## ingredients.py
- scale_ingredients
- get_event_ingredient_list
- normalize_ingredient
- parse_ingredient_line
- get_or_create_ingredient
- categorize_ingredient
- parse_recipe_ingredients
- update_recipe_with_parsed_ingredients
- search_recipes_by_ingredient
- search_ingredients
- ingredient_catalogue_ui
- _browse_ingredients_tab
- _ingredient_search_tab
- _parse_recipes_tab
- _show_ingredient_details
- migrate_existing_recipes
- get_ingredient_analytics

## ingredients_editor.py
- ingredients_editor_ui

## landing.py
- show

## layout.py
- inject_custom_css
- render_event_mode_indicator
- render_chat_bubble
- render_fully_draggable_chat
- render_chat_window
- _process_chat_input
- _get_ai_response_improved
- render_chat_messages
- _add_message
- _get_ai_response
- render_top_navbar
- render_leave_event_button
- render_status_indicator
- apply_theme
- responsive_container
- render_enhanced_sidebar
- render_smart_event_button
- render_info_card
- render_floating_assistant
- show_event_mode_banner
- render_event_toolbar
- render_login_status_button

## menu_editor.py
- menu_editor_ui
- full_menu_editor_ui
- _get_meal_index

## menu_viewer.py
- menu_viewer_ui
- _get_meal_index

## menus.py

## mobile_components.py
- render_mobile_header
- mobile_card
- swipeable_list
- virtual_scroll_list
- mobile_form
- mobile_input
- mobile_select
- mobile_button
- mobile_table
- mobile_metric
- mobile_skeleton
- mobile_spinner
- mobile_bottom_sheet
- mobile_action_sheet
- mobile_search_bar
- mobile_fab
- mobile_progress_bar
- mobile_circular_progress
- mobile_toast
- inject_mobile_styles
- inject_mobile_scripts
- detect_mobile
- get_viewport_size
- mobile_safe_columns
- save_mobile_state
- load_mobile_state
- track_mobile_performance

## mobile_helpers.py
- safe_columns
- safe_dataframe
- safe_file_uploader

## mobile_layout.py
- mobile_file_uploader
- mobile_table
- mobile_safe_columns
- mobile_select
- mobile_input
- mobile_button
- mobile_card
- render_mobile_navigation
- __init__
- is_mobile
- apply_mobile_theme
- render_mobile_navigation
- render_mobile_dashboard

## notifications.py
- get_db
- get_user_notifications
- get_suggestion_count
- notifications_sidebar
- send_notification

## packing.py
- packing_ui
- _show_all_events_packing
- _render_event_packing
- _render_task_list
- _render_task_item
- _render_equipment_list
- _render_grocery_list
- _render_packing_summary
- _export_packing_checklist
- _get_event_info

## pdf_export.py
- generate_event_summary_pdf
- pdf_export_ui
- add_section

## post_event.py
- post_event_ui
- _show_completed_events_list
- _render_post_event_form
- show_post_event_analytics

## receipts.py
- receipt_upload_ui
- _parse_receipt_with_ai
- _parse_receipt_fallback
- _parse_date
- show_receipt_analytics
- _display_receipts
- _upload_receipt_section
- _view_receipts_section

## recipe_viewer.py
- normalize_quantity
- normalize_unit
- render_recipe_preview

## recipes.py
- find_recipe_by_name
- render_ingredient_columns
- parse_and_store_recipe_from_file
- save_recipe_to_firestore
- save_event_to_firestore
- save_menu_to_firestore
- save_ingredient_to_firestore
- add_recipe_via_link_ui
- add_recipe_manual_ui
- _render_recipe_card
- recipes_page

## recipes_editor.py
- render_ingredient_columns
- recipe_editor_ui

## roles.py
- get_all_users
- get_user_role
- update_user_role
- role_admin_ui
- show_user_activity_summary
- initialize_role_system
- role_admin_ui_legacy

## shopping_lists.py
- create_shopping_list
- update_shopping_list
- delete_shopping_list
- get_shopping_list
- list_shopping_lists

## suggestions.py
- create_suggestion
- suggestion_input
- approve_suggestion
- reject_suggestion
- get_pending_suggestions
- get_suggestion_count
- ai_submit_suggestion

## tag_explorer.py
- tag_explorer_ui
- _get_tag_usage
- _render_constellation

## tag_utils.py
- suggest_recipe_tags

## ui_components.py
- inject_layout_fixes
- show_event_mode_banner
- render_event_toolbar
- render_event_controls
- render_quick_event_switcher
- show_context_message
- render_event_status_widget
- apply_purple_theme_to_widget
- create_unique_key
- safe_button
- render_tag_group
- edit_metadata_ui

## upload.py
- upload_ui_desktop
- upload_ui_mobile

## upload_integration.py
- save_parsed_menu_ui
- show_save_file_actions

## user_session_initializer.py
- enrich_session_from_token

## utils.py
- get_db
- get_scoped_query
- is_event_scoped
- get_event_scope_message
- menu_editor_ui_scoped
- file_manager_ui_scoped
- session_get
- session_set
- delete_button
- normalize_ingredient
- generate_id
- format_date
- format_day_label
- format_timestamp
- safe_dict_merge
- normalize_keys
- format_fraction
- normalize_recipe_quantities
- value_to_text
- deep_get
- get_active_event_id
- get_active_event
- get_event_by_id
- suggest_edit_box
- log_user_action
