import streamlit as st
from datetime import datetime
from auth import get_user_role
from firebase_init import db
from utils import format_date, generate_id, get_active_event, get_active_event_id, value_to_text, delete_button
import json
from google.cloud.firestore_v1.base_query import FieldFilter
from firebase_admin import firestore

# Initialize OpenAI client

try:
    from openai import OpenAI
    
    api_key = st.secrets.get("openai", {}).get("api_key", "")
    if api_key and api_key != "":
        client = OpenAI(api_key=api_key)
    else:
        client = None
        st.warning("⚠️ OpenAI API key not configured")
except ImportError:
    client = None
    st.error("❌ OpenAI library not installed")
except Exception as e:
    client = None
    st.error(f"❌ OpenAI initialization failed: {e}")

# ----------------------------
# 💬 AI Chat Assistant UI
# ----------------------------
def ai_chat_ui(user: dict | None = None) -> None:
    st.title("💬 Assistant")
    st.caption("Your AI-powered catering assistant for event planning, menus, and coordination.")

    user = st.session_state.get("user")
    if not user:
        st.warning("You must be signed in to use the assistant.")
        return
    selected_recipe_id = st.session_state.get("selected_recipe_id")
    recipe_context = None
    if selected_recipe_id:
        try:
            recipe_doc = db.collection("recipes").document(selected_recipe_id).get()
            if recipe_doc.exists:
                recipe_context = recipe_doc.to_dict()
        except Exception as e:
            st.warning(f"⚠️ Failed to load recipe context: {e}")


    # Check if OpenAI is available
    if not client:
        st.error("🤖 AI Assistant is currently unavailable. Please check the configuration.")
        return

    role = get_user_role(user)

    # Show current context
    active_event = get_active_event()
    if active_event:
        st.info(f"🎯 Active Event: **{active_event.get('name', 'Unknown')}** ({active_event.get('guest_count', 0)} guests)")
    else:
        st.info("💡 No active event. AI will provide general catering assistance.")

    # Quick action buttons
    st.markdown("### 🎯 Quick Actions")
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        if st.button("🛒 Shopping List", use_container_width=True):
            handle_quick_action("shopping")
    
    with col2:
        if st.button("📋 Menu Plan", use_container_width=True):
            handle_quick_action("menu")
    
    with col3:
        if st.button("⏰ Timeline", use_container_width=True):
            handle_quick_action("timeline")
    
    with col4:
        if st.button("📊 Quantities", use_container_width=True):
            handle_quick_action("quantities")

    # Initialize chat history
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    if recipe_context:
        with st.expander("📘 Recipe Context (linked)", expanded=False):
            st.markdown(f"**Name:** {recipe_context.get('name', 'Unnamed')}")
            st.markdown(f"**Author:** {recipe_context.get('author_name', 'Unknown')}")
            st.markdown(f"**Ingredients:**\n{value_to_text(recipe_context.get('ingredients', ''))}")
            st.markdown(f"**Instructions:**\n{value_to_text(recipe_context.get('instructions', ''))}")
            if st.button("🧠 Ask AI about this recipe"):
                st.session_state.chat_history.append({
                    "sender": "user",
                    "content": f"Analyze or suggest improvements for this recipe: {recipe_context.get('name', '')}",
                    "timestamp": format_date(datetime.now())
                })
                st.rerun()


    # Chat interface
    st.markdown("### 💬 Conversation")
    
    # Display chat history
    for i, chat in enumerate(st.session_state.chat_history[-20:]):  # Show last 20 messages
        if chat.get("sender") == "user":
            st.markdown(f"**🧑 You:** {chat.get('content', '')}")
        else:
            with st.expander(f"🤖 **AI** - {chat.get('timestamp', 'Now')}", expanded=(i == len(st.session_state.chat_history) - 1)):
                st.markdown(chat.get('content', ''))
                
                # Show action buttons if AI suggested actions
                if chat.get('actions'):
                    st.markdown("**Suggested Actions:**")
                    for action in chat['actions']:
                        if st.button(action['label'], key=f"action_{i}_{action['id']}"):
                            handle_ai_action(action)

    # Chat input
    with st.form("chat_input_form", clear_on_submit=True):
        user_input = st.text_area(
            "Ask your question:", 
            placeholder="E.g., 'Help me plan a menu for 50 people with vegetarian options'",
            height=100
        )
        
        col1, col2, col3 = st.columns([1, 1, 3])
        with col1:
            include_context = st.checkbox("Include event details", value=True)
        with col2:
            send_button = st.form_submit_button("Send", type="primary", use_container_width=True)
        
        if send_button and user_input.strip():
            with st.spinner("🤖 Thinking..."):
                response = get_openai_response(user_input.strip(), role, user, include_context)
                
                # Add to chat history
                st.session_state.chat_history.append({
                    "sender": "user",
                    "content": user_input.strip(),
                    "timestamp": format_date(datetime.now())
                })
                
                st.session_state.chat_history.append({
                    "sender": "ai",
                    "content": response["content"],
                    "actions": response.get("actions", []),
                    "timestamp": format_date(datetime.now())
                })
                
                # Log conversation
                log_conversation(user["id"], user_input.strip(), response["content"], role)
                
                st.rerun()

    # Clear chat button
    if delete_button("🗑️ Clear Conversation", key="clear_chat"):
        st.session_state.chat_history = []
        st.success("Conversation cleared")
        st.rerun()

# ----------------------------
# 🤖 AI Response Generation
# ----------------------------
def get_openai_response(prompt: str, role: str, user: dict, include_context: bool = True) -> dict:
    """Get response from OpenAI with full context"""
    if not client:
        return {
            "content": "⚠️ AI service is not available. Please check the configuration.",
            "actions": []
        }
    
    try:
        # Build context
        context = build_context(user, include_context)
        
        # System message
        system_message = f"""You are a professional catering assistant for Mountain Medicine Catering. 
You help with event planning, menu design, shopping lists, timelines, and coordination.

User role: {role}
{context}

Provide practical, actionable advice. Be specific with quantities, timings, and steps.
When relevant, suggest concrete actions the user can take.
Format your responses with clear sections using markdown.
If you suggest creating lists or documents, format them properly."""

        # Get recent chat history for context
        recent_history = []
        for chat in st.session_state.get("chat_history", [])[-10:]:
            recent_history.append({
                "role": "user" if chat["sender"] == "user" else "assistant",
                "content": chat["content"]
            })

        # Build messages
        messages = [
            {"role": "system", "content": system_message}
        ]
        messages.extend(recent_history)
        messages.append({"role": "user", "content": prompt})

        # Get response
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=1000,
        )
        
        content = response.choices[0].message.content.strip()
        
        # Extract any actionable items
        actions = extract_actions(content, prompt)
        
        return {
            "content": content,
            "actions": actions
        }
        
    except Exception as e:
        return {
            "content": f"⚠️ I encountered an error: {str(e)}. Please try again or rephrase your question.",
            "actions": []
        }

# ----------------------------
# 🎯 Quick Action Handlers
# ----------------------------
def handle_quick_action(action_type: str):
    """Handle quick action button clicks"""
    active_event = get_active_event()
    
    if not active_event and action_type != "general":
        st.warning("Please activate an event first to use this quick action.")
        return
    
    prompts = {
        "shopping": f"Create a detailed shopping list for {active_event.get('name', 'the event')} with {active_event.get('guest_count', 20)} guests. Include quantities and organize by store sections.",
        "menu": f"Suggest a complete menu for {active_event.get('name', 'the event')} with {active_event.get('guest_count', 20)} guests. Consider dietary restrictions: {active_event.get('dietary_restrictions', 'none specified')}",
        "timeline": f"Create a detailed preparation timeline for {active_event.get('name', 'the event')} on {active_event.get('start_date', 'the event date')}. Include all prep stages.",
        "quantities": f"Calculate ingredient quantities for {active_event.get('guest_count', 20)} guests. Include portion sizes and account for 10% buffer."
    }
    
    if action_type in prompts:
        # Add to chat as if user typed it
        st.session_state.setdefault("chat_history", []).append({
            "sender": "user",
            "content": prompts[action_type],
            "timestamp": format_date(datetime.now())
        })
        
        # Get AI response
        user = st.session_state.get("user")
        role = get_user_role(user)
        
        with st.spinner("🤖 Generating..."):
            response = get_openai_response(prompts[action_type], role, user, True)
            
            st.session_state.chat_history.append({
                "sender": "ai",
                "content": response["content"],
                "actions": response.get("actions", []),
                "timestamp": format_date(datetime.now())
            })
            
            log_conversation(user["id"], prompts[action_type], response["content"], role)
        
        st.rerun()

# ----------------------------
# 🔧 Helper Functions
# ----------------------------
def build_context(user: dict, include_event: bool = True) -> str:
    """Build context string for AI"""
    context_parts = []
        # Add recipe context if available
    recipe_id = st.session_state.get("selected_recipe_id")
    if recipe_id:
        try:
            recipe_doc = db.collection("recipes").document(recipe_id).get()
            if recipe_doc.exists:
                recipe = recipe_doc.to_dict()
                context_parts.append(f"Recipe: {recipe.get('name', 'Unnamed')}")
                context_parts.append("Ingredients:\n" + recipe.get("ingredients", "—"))
                context_parts.append("Instructions:\n" + recipe.get("instructions", "—"))
        except Exception as e:
            context_parts.append("⚠️ Failed to load selected recipe context.")

    
    if include_event:
        active_event = get_active_event()
        if active_event:
            context_parts.append(f"Active Event: {active_event.get('name', 'Unknown')}")
            context_parts.append(f"Date: {active_event.get('start_date', 'TBD')} to {active_event.get('end_date', 'TBD')}")
            context_parts.append(f"Location: {active_event.get('location', 'TBD')}")
            context_parts.append(f"Guests: {active_event.get('guest_count', 0)}")
            context_parts.append(f"Staff: {active_event.get('staff_count', 0)}")
            
            if active_event.get('dietary_restrictions'):
                context_parts.append(f"Dietary Restrictions: {active_event['dietary_restrictions']}")
            if active_event.get('food_allergies'):
                context_parts.append(f"Allergies: {active_event['food_allergies']}")
            
            # Get menu items count
            try:
                menu_count = len(list(db.collection("menus").where("event_id", "==", active_event["id"]).stream()))
                context_parts.append(f"Menu Items: {menu_count}")
            except:
                pass
    
    return "\n".join(context_parts) if context_parts else "No active event context."

def extract_actions(content: str, prompt: str) -> list:
    """Extract actionable items from AI response"""
    actions = []
    
    # Check for shopping list generation
    if any(word in content.lower() for word in ['shopping list', 'grocery list', 'ingredients to buy']):
        actions.append({
            "id": "create_shopping",
            "label": "📝 Save as Shopping List",
            "type": "shopping_list",
            "data": content
        })
    
    # Check for menu suggestions
    if any(word in content.lower() for word in ['menu suggestion', 'menu plan', 'dishes']):
        actions.append({
            "id": "save_menu",
            "label": "💾 Save Menu Suggestions",
            "type": "menu",
            "data": content
        })
    
    # Check for timeline
    if any(word in content.lower() for word in ['timeline', 'schedule', 'preparation steps']):
        actions.append({
            "id": "create_timeline",
            "label": "📅 Create Tasks from Timeline",
            "type": "timeline",
            "data": content
        })
    
    return actions

def handle_ai_action(action: dict):
    """Handle action button clicks from AI suggestions"""
    action_type = action.get("type")
    data = action.get("data", "")
    
    if action_type == "shopping_list":
        # Parse and save shopping list
        try:
            active_event_id = get_active_event_id()
            if active_event_id:
                save_ai_shopping_list(active_event_id, data)
                st.success("✅ Shopping list saved to the event!")
            else:
                st.warning("Please activate an event first")
        except Exception as e:
            st.error(f"Failed to save shopping list: {e}")
    
    elif action_type == "menu":
        # Save menu suggestions
        st.info("Menu saving feature coming soon!")
    
    elif action_type == "timeline":
        # Create tasks from timeline
        st.info("Task creation feature coming soon!")
    
    st.rerun()

def save_ai_shopping_list(event_id: str, content: str):
    """Parse AI content and save as shopping items"""
    # Simple parsing - this could be enhanced
    lines = content.split('\n')
    shopping_ref = db.collection("events").document(event_id).collection("shopping_items")
    
    current_category = "Other"
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check if it's a category header
        if line.startswith('**') and line.endswith('**'):
            current_category = line.strip('*').strip(':').strip()
        elif line.startswith('•') or line.startswith('-'):
            # It's an item
            item_text = line.strip('•-').strip()
            
            # Try to extract quantity
            parts = item_text.split('(')
            if len(parts) > 1:
                name = parts[0].strip()
                qty_part = parts[1].strip(')')
                # Simple quantity extraction
                quantity = qty_part.split()[0] if qty_part else ""
                unit = ' '.join(qty_part.split()[1:]) if len(qty_part.split()) > 1 else ""
            else:
                name = item_text
                quantity = ""
                unit = ""
            
            if name:
                item_id = generate_id("shop")
                shopping_ref.document(item_id).set({
                    "id": item_id,
                    "name": name,
                    "quantity": quantity,
                    "unit": unit,
                    "category": current_category,
                    "purchased": False,
                    "created_at": datetime.utcnow(),
                    "created_by": "ai_assistant"
                })

def log_conversation(user_id: str, query: str, response: str, user_role: str):
    """Log conversation to database"""
    try:
        db.collection("ai_logs").add({
            "query": query,
            "response": response,
            "user_id": user_id,
            "user_role": user_role,
            "created_at": datetime.utcnow(),
            "event_id": get_active_event_id()
        })
    except Exception as e:
        print(f"Failed to log conversation: {e}")

# ----------------------------
# 📊 AI Usage Analytics
# ----------------------------
def show_ai_usage_analytics():
    """Show AI usage statistics"""
    st.subheader("📊 AI Assistant Usage")
    
    try:
        # Get usage logs
        logs = list(db.collection("ai_logs").order_by("created_at", direction=firestore.Query.DESCENDING).limit(100).stream())
        
        if not logs:
            st.info("No AI usage data yet.")
            return
        
        # Calculate metrics
        total_queries = len(logs)
        unique_users = len(set(log.to_dict().get("user_id") for log in logs))
        
        # Common query types
        query_types = {
            "shopping": 0,
            "menu": 0,
            "timeline": 0,
            "quantities": 0,
            "other": 0
        }
        
        for log in logs:
            query = log.to_dict().get("query", "").lower()
            if "shopping" in query or "grocery" in query:
                query_types["shopping"] += 1
            elif "menu" in query or "food" in query or "dish" in query:
                query_types["menu"] += 1
            elif "timeline" in query or "schedule" in query:
                query_types["timeline"] += 1
            elif "quantity" in query or "portion" in query or "how much" in query:
                query_types["quantities"] += 1
            else:
                query_types["other"] += 1
        
        # Display metrics
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric("Total Queries", total_queries)
        with col2:
            st.metric("Unique Users", unique_users)
        with col3:
            avg_per_user = total_queries / unique_users if unique_users > 0 else 0
            st.metric("Avg Queries/User", f"{avg_per_user:.1f}")
        
        # Query type breakdown
        st.markdown("#### Query Types")
        for qtype, count in sorted(query_types.items(), key=lambda x: x[1], reverse=True):
            if count > 0:
                percentage = (count / total_queries) * 100
                st.write(f"**{qtype.title()}:** {count} ({percentage:.1f}%)")
        
    except Exception as e:
        st.error(f"Could not load analytics: {e}")
