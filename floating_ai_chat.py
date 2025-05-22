# simple_floating_chat.py - Working floating chat with minimize functionality

from datetime import datetime
import streamlit as st
from datetime import datetime

# ----------------------------
# 💬 Simple Floating Chat System
# ----------------------------

def render_floating_chat():
    """Render a working floating chat system"""
    user = st.session_state.get("user")
    if not user:
        return
    
    # Initialize chat state
    if "chat_open" not in st.session_state:
        st.session_state.chat_open = False
    if "chat_messages" not in st.session_state:
        st.session_state.chat_messages = []
    
    # Render chat interface
    render_chat_interface()

def render_chat_interface():
    """Render the complete chat interface"""
    # Chat bubble CSS
    chat_css = """
    <style>
    .floating-chat-container {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 1000;
    }
    
    .chat-bubble {
        width: 60px;
        height: 60px;
        background: #6C4AB6;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(108, 74, 182, 0.3);
        transition: all 0.3s ease;
        color: white;
        font-size: 24px;
        user-select: none;
    }
    
    .chat-bubble:hover {
        background: #563a9d;
        transform: scale(1.1);
    }
    
    .chat-window {
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 350px;
        height: 450px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform-origin: bottom right;
        transition: transform 0.3s ease, opacity 0.3s ease;
    }
    
    .chat-window.hidden {
        transform: scale(0.8);
        opacity: 0;
        pointer-events: none;
    }
    
    .chat-header {
        background: #6C4AB6;
        color: white;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
    }
    
    .close-btn {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 18px;
        padding: 0;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .close-btn:hover {
        background: rgba(255,255,255,0.2);
    }
    
    .chat-body {
        flex: 1;
        padding: 1rem;
        overflow-y: auto;
        background: #fafafa;
    }
    
    .chat-message {
        margin-bottom: 1rem;
        padding: 0.5rem;
        border-radius: 8px;
        max-width: 85%;
        word-wrap: break-word;
    }
    
    .chat-message.user {
        background: #B8A4D4;
        color: white;
        margin-left: auto;
        text-align: right;
    }
    
    .chat-message.ai {
        background: #e9ecef;
        color: #333;
        margin-right: auto;
    }
    
    .chat-input-section {
        padding: 1rem;
        border-top: 1px solid #eee;
        background: white;
    }
    
    @media (max-width: 768px) {
        .floating-chat-container {
            bottom: 1rem;
            right: 1rem;
            left: 1rem;
        }
        
        .chat-window {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            height: 70vh;
            border-radius: 12px 12px 0 0;
        }
        
        .chat-bubble {
            width: 50px;
            height: 50px;
            font-size: 20px;
        }
    }
    </style>
    """
    
    st.markdown(chat_css, unsafe_allow_html=True)
    
    # Chat container with toggle functionality
    chat_html = f"""
    <div class="floating-chat-container">
        <div class="chat-bubble" onclick="toggleChat()" id="chatBubble">
            💬
        </div>
        <div class="chat-window {'hidden' if not st.session_state.chat_open else ''}" id="chatWindow">
            <div class="chat-header">
                <span>🤖 AI Assistant</span>
                <button class="close-btn" onclick="toggleChat()">×</button>
            </div>
            <div class="chat-body" id="chatBody">
                {render_chat_messages()}
            </div>
            <div class="chat-input-section">
                <div style="margin-bottom: 0.5rem;">
                    <strong>🎯 Quick Actions:</strong>
                </div>
                <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
                    <button onclick="sendQuickMessage('Generate a shopping list for the active event')" 
                            style="background: #6C4AB6; color: white; border: none; padding: 0.3rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                        🛒 Shopping
                    </button>
                    <button onclick="sendQuickMessage('Suggest menu items for the active event')"
                            style="background: #6C4AB6; color: white; border: none; padding: 0.3rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                        📋 Menu
                    </button>
                    <button onclick="sendQuickMessage('Help me create an event timeline')"
                            style="background: #6C4AB6; color: white; border: none; padding: 0.3rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                        ⏰ Timeline
                    </button>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" id="chatInput" placeholder="Ask me anything..." 
                           style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;"
                           onkeypress="if(event.key==='Enter') sendMessage()">
                    <button onclick="sendMessage()" 
                            style="background: #6C4AB6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                        Send
                    </button>
                </div>
            </div>
        </div>
    </div>
    """
    
    # JavaScript for chat functionality
    chat_js = """
    <script>
    let chatOpen = """ + str(st.session_state.chat_open).lower() + """;
    
    function toggleChat() {
        chatOpen = !chatOpen;
        const chatWindow = document.getElementById('chatWindow');
        
        if (chatOpen) {
            chatWindow.classList.remove('hidden');
        } else {
            chatWindow.classList.add('hidden');
        }
        
        // Update Streamlit state
        window.parent.postMessage({
            type: 'streamlit:chat_toggle',
            value: chatOpen
        }, '*');
    }
    
    function sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (!message) return;
        
        addMessageToChat('user', message);
        input.value = '';
        
        // Send to Streamlit backend
        sendToStreamlit(message);
    }
    
    function sendQuickMessage(message) {
        addMessageToChat('user', message);
        sendToStreamlit(message);
    }
    
    function addMessageToChat(sender, content) {
        const chatBody = document.getElementById('chatBody');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        messageDiv.innerHTML = `<strong>${sender === 'user' ? 'You' : 'AI'}:</strong> ${content}`;
        chatBody.appendChild(messageDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }
    
    function sendToStreamlit(message) {
        // Simulate AI response for demo
        setTimeout(() => {
            let response = "I'd be happy to help with your catering needs! ";
            
            if (message.toLowerCase().includes('shopping')) {
                response = "Here's a sample shopping list:\\n• Fresh vegetables\\n• Proteins (chicken, fish)\\n• Grains (rice, pasta)\\n• Seasonings and spices";
            } else if (message.toLowerCase().includes('menu')) {
                response = "Here are some menu suggestions:\\n• Grilled chicken with herbs\\n• Seasonal vegetable medley\\n• Wild rice pilaf\\n• Fresh fruit dessert";
            } else if (message.toLowerCase().includes('timeline')) {
                response = "Here's a basic event timeline:\\n• 2 days before: Shop for ingredients\\n• 1 day before: Prep vegetables\\n• Day of: Start cooking 4 hours before service";
            }
            
            addMessageToChat('ai', response.replace(/\\n/g, '<br>'));
        }, 1000);
    }
    
    // Initialize chat state
    document.addEventListener('DOMContentLoaded', function() {
        const chatWindow = document.getElementById('chatWindow');
        if (!chatOpen) {
            chatWindow.classList.add('hidden');
        }
    });
    </script>
    """
    
    # Render the complete chat interface
    st.markdown(chat_html + chat_js, unsafe_allow_html=True)
    
    # Handle chat state changes from JavaScript
    if st.button("", key="hidden_chat_toggle", help="Hidden chat toggle"):
        st.session_state.chat_open = not st.session_state.chat_open
        st.rerun()

def render_chat_messages():
    """Render existing chat messages as HTML"""
    if not st.session_state.chat_messages:
        return '<div style="text-align: center; color: #666; margin-top: 2rem;">👋 Hi! Ask me about your events, menus, or planning!</div>'
    
    messages_html = ""
    for msg in st.session_state.chat_messages[-10:]:  # Show last 10 messages
        sender_class = msg.get("sender", "ai")
        sender_label = "You" if sender_class == "user" else "AI"
        content = msg.get("content", "")
        
        messages_html += f"""
        <div class="chat-message {sender_class}">
            <strong>{sender_label}:</strong> {content}
        </div>
        """
    
    return messages_html

# ----------------------------
# 🎯 Chat Integration Functions
# ----------------------------

def add_chat_message(sender: str, content: str):
    """Add a message to the chat history"""
    if "chat_messages" not in st.session_state:
        st.session_state.chat_messages = []
    
    st.session_state.chat_messages.append({
        "sender": sender,
        "content": content,
        "timestamp": datetime.now()
    })

def integrate_simple_chat():
    """Main integration function for the simple chat"""
    render_floating_chat()

# For backward compatibility
def render_floating_ai_chat():
    """Legacy function name"""
    integrate_simple_chat()
