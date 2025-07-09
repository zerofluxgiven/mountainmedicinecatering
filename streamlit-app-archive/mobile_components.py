import streamlit as st
from typing import List, Dict, Any, Optional, Callable
import json
from datetime import datetime

# -----------------------------
# Mobile Navigation Components
# -----------------------------

def render_mobile_header(
    title: str = "Mountain Medicine",
    show_menu: bool = True,
    nav_items: Optional[List[str]] = None,
) -> None:
    """Render mobile header and hidden navigation menu"""
    nav_items = nav_items or ["Dashboard", "Events", "Recipes", "Chat", "Profile"]

    menu_html = "<div id=\"mobile-nav-menu\" class=\"mobile-nav-menu\">"
    for item in nav_items:
        menu_html += (
            f"<a href=\"#\" class=\"mobile-nav-link\" "
            f"onclick=\"selectMobileNav('{item}')\">{item}</a>"
        )
    menu_html += "</div>"

    header_html = f"""
    <div class="mobile-header">
        <div class="mobile-header-content">
            <div class="header-left">
                {f'<button class="mobile-menu-toggle" onclick="toggleMobileMenu()">☰</button>' if show_menu else ''}
                <h1 class="mobile-title">{title}</h1>
            </div>
            <div class="header-right">
                <button class="notification-button" onclick="toggleNotifications()">
                    <span class="notification-icon">🔔</span>
                    <span class="nav-badge" id="notification-count" style="display: none;">0</span>
                </button>
            </div>
        </div>
    </div>
    {menu_html}
    """
    st.markdown(header_html, unsafe_allow_html=True)


# -----------------------------
# Mobile Card Components
# -----------------------------

def mobile_card(
    title: str,
    content: str = "",
    icon: str = None,
    actions: List[Dict[str, Any]] = None,
    expandable: bool = False,
    key: str = None
) -> None:
    """Render a mobile-optimized card with touch interactions"""
    card_id = key or f"card_{hash(title)}"
    
    card_html = f"""
    <div class="mobile-card" id="{card_id}" data-expandable="{str(expandable).lower()}">
        <div class="card-header">
            {f'<span class="card-icon">{icon}</span>' if icon else ''}
            <h3 class="card-title">{title}</h3>
            {f'<span class="expand-icon">▼</span>' if expandable else ''}
        </div>
        <div class="card-content">
            {content}
        </div>
    """
    
    if actions:
        card_html += '<div class="card-actions">'
        for action in actions:
            card_html += f"""
            <button class="card-action-button" onclick="{action.get('onclick', '')}">
                {action.get('icon', '')} {action.get('label', '')}
            </button>
            """
        card_html += '</div>'
    
    card_html += '</div>'
    
    st.markdown(card_html, unsafe_allow_html=True)

# -----------------------------
# Mobile List Components
# -----------------------------

def swipeable_list(
    items: List[Dict[str, Any]],
    on_swipe_left: Optional[Callable] = None,
    on_swipe_right: Optional[Callable] = None,
    key: str = "swipeable_list"
) -> None:
    """Render a list with swipeable items"""
    list_html = f'<div class="swipeable-list" id="{key}">'
    
    for i, item in enumerate(items):
        item_id = f"{key}_item_{i}"
        list_html += f"""
        <div class="swipeable-item" data-id="{item.get('id', i)}">
            <div class="item-content">
                <div class="item-icon">{item.get('icon', '📄')}</div>
                <div class="item-details">
                    <h4 class="item-title">{item.get('title', 'Untitled')}</h4>
                    <p class="item-subtitle">{item.get('subtitle', '')}</p>
                </div>
                <div class="item-meta">{item.get('meta', '')}</div>
            </div>
            <div class="swipe-actions">
                <button class="swipe-action edit" onclick="handleSwipeAction('edit', '{item.get('id', i)}')">
                    Edit
                </button>
                <button class="swipe-action delete" onclick="handleSwipeAction('delete', '{item.get('id', i)}')">
                    Delete
                </button>
            </div>
        </div>
        """
    
    list_html += '</div>'
    
    st.markdown(list_html, unsafe_allow_html=True)

def virtual_scroll_list(
    items: List[Dict[str, Any]],
    item_height: int = 80,
    container_height: int = 400,
    key: str = "virtual_list"
) -> None:
    """Render a virtual scrolling list for performance"""
    container_html = f"""
    <div class="virtual-scroll-container" 
         id="{key}" 
         style="height: {container_height}px; overflow-y: auto;">
        <div class="virtual-scroll-content" style="height: {len(items) * item_height}px;">
    """
    
    # Only render visible items initially
    visible_count = (container_height // item_height) + 2
    
    for i, item in enumerate(items[:visible_count]):
        container_html += f"""
        <div class="virtual-item" style="height: {item_height}px; transform: translateY({i * item_height}px);">
            {item.get('content', '')}
        </div>
        """
    
    container_html += '</div></div>'
    
    # Add JS for virtual scrolling
    js_code = f"""
    <script>
    const container = document.getElementById('{key}');
    const items = {json.dumps(items)};
    const itemHeight = {item_height};
    
    container.addEventListener('scroll', () => {{
        const scrollTop = container.scrollTop;
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = startIndex + Math.ceil(container.clientHeight / itemHeight) + 1;
        
        // Update visible items
        updateVisibleItems(startIndex, endIndex);
    }});
    </script>
    """
    
    st.markdown(container_html + js_code, unsafe_allow_html=True)

# -----------------------------
# Mobile Form Components
# -----------------------------

def mobile_form(form_id: str = "mobile_form") -> None:
    """Create a mobile-optimized form context"""
    form_html = f"""
    <form class="mobile-form" id="{form_id}" onsubmit="handleFormSubmit(event, '{form_id}')">
    </form>
    """
    st.markdown(form_html, unsafe_allow_html=True)

def mobile_input(
    label: str,
    value: str = "",
    type: str = "text",
    placeholder: str = "",
    required: bool = False,
    voice_enabled: bool = True,
    key: str = None
) -> str:
    """Render a mobile-optimized input field"""
    input_id = key or f"input_{hash(label)}"
    
    # Build voice button separately to avoid backslash in f-string
    voice_button = ""
    if voice_enabled and type == "text":
        voice_button = f'<button type="button" class="voice-input-btn" onclick="startVoiceInput(\'{input_id}\')">🎤</button>'
    
    input_html = f"""
    <div class="mobile-input-group">
        <label for="{input_id}" class="mobile-label">{label}</label>
        <div class="input-wrapper">
            <input 
                type="{type}"
                id="{input_id}"
                name="{input_id}"
                class="mobile-input"
                value="{value}"
                placeholder="{placeholder}"
                {'required' if required else ''}
                autocomplete="on"
            />
            {voice_button}
        </div>
    </div>
    """
    
    st.markdown(input_html, unsafe_allow_html=True)
    
    # Return current value from session state
    return st.session_state.get(input_id, value)

def mobile_select(
    label: str,
    options: List[str],
    value: str | None = None,
    key: str | None = None,
) -> str:
    """Render a select box optimized for mobile."""
    return st.selectbox(
        label,
        options,
        index=options.index(value) if value in options else 0,
        key=key,
    )

def mobile_button(
    label: str,
    type: str = "primary",
    icon: str = None,
    full_width: bool = True,
    onclick: str = None,
    key: str = None
) -> bool:
    """Render a mobile-optimized button"""
    button_id = key or f"btn_{hash(label)}"
    button_classes = f"touch-button {type} {'full-width' if full_width else ''}"
    
    # Build onclick handler separately
    onclick_handler = onclick or f"handleButtonClick('{button_id}')"
    
    # Build icon span separately
    icon_span = f'<span class="button-icon">{icon}</span>' if icon else ''
    
    button_html = f"""
    <button 
        type="button"
        id="{button_id}"
        class="{button_classes}"
        onclick="{onclick_handler}"
    >
        {icon_span}
        <span class="button-label">{label}</span>
    </button>
    """
    
    st.markdown(button_html, unsafe_allow_html=True)
    
    # Check if button was clicked
    return st.session_state.get(f"{button_id}_clicked", False)

# -----------------------------
# Mobile Data Display
# -----------------------------

def mobile_table(
    data: List[Dict[str, Any]],
    columns: List[Dict[str, str]],
    key: str = "mobile_table"
) -> None:
    """Render a mobile-optimized data table"""
    table_html = f'<div class="mobile-table" id="{key}">'
    
    for i, row in enumerate(data):
        table_html += f'<div class="mobile-table-row" data-index="{i}">'
        
        for col in columns:
            field = col.get('field')
            label = col.get('label', field)
            value = row.get(field, '')
            
            table_html += f"""
            <div class="mobile-table-cell">
                <div class="mobile-table-label">{label}</div>
                <div class="mobile-table-value">{value}</div>
            </div>
            """
        
        table_html += '</div>'
    
    table_html += '</div>'
    
    st.markdown(table_html, unsafe_allow_html=True)

def mobile_metric(
    label: str,
    value: Any,
    delta: Any = None,
    delta_color: str = "normal",
    icon: str = None
) -> None:
    """Render a mobile-optimized metric display"""
    metric_html = f"""
    <div class="mobile-metric">
        {f'<div class="metric-icon">{icon}</div>' if icon else ''}
        <div class="metric-content">
            <div class="metric-label">{label}</div>
            <div class="metric-value">{value}</div>
            {f'<div class="metric-delta {delta_color}">{delta}</div>' if delta else ''}
        </div>
    </div>
    """
    
    st.markdown(metric_html, unsafe_allow_html=True)

# -----------------------------
# Mobile Loading States
# -----------------------------

def mobile_skeleton(type: str = "card", count: int = 1) -> None:
    """Render skeleton loading states"""
    skeleton_html = ""
    
    for _ in range(count):
        if type == "card":
            skeleton_html += """
            <div class="skeleton skeleton-card">
                <div class="skeleton-header"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text" style="width: 80%;"></div>
            </div>
            """
        elif type == "list":
            skeleton_html += """
            <div class="skeleton skeleton-list-item">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-content">
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text" style="width: 60%;"></div>
                </div>
            </div>
            """
    
    st.markdown(skeleton_html, unsafe_allow_html=True)

def mobile_spinner(text: str = "Loading...") -> None:
    """Render a mobile-optimized spinner"""
    spinner_html = f"""
    <div class="mobile-spinner-container">
        <div class="mobile-spinner"></div>
        <div class="spinner-text">{text}</div>
    </div>
    """
    
    st.markdown(spinner_html, unsafe_allow_html=True)

# -----------------------------
# Mobile Modal & Sheets
# -----------------------------

def mobile_bottom_sheet(
    content: str,
    title: str = "",
    show: bool = False,
    key: str = "bottom_sheet"
) -> None:
    """Render a mobile bottom sheet modal"""
    sheet_html = f"""
    <div class="mobile-modal-overlay {'active' if show else ''}" id="{key}_overlay" onclick="closeBottomSheet('{key}')">
        <div class="mobile-modal" id="{key}" onclick="event.stopPropagation()">
            <div class="modal-handle"></div>
            {f'<h3 class="modal-title">{title}</h3>' if title else ''}
            <div class="modal-content">
                {content}
            </div>
        </div>
    </div>
    """
    
    st.markdown(sheet_html, unsafe_allow_html=True)

def mobile_action_sheet(
    actions: List[Dict[str, Any]],
    show: bool = False,
    key: str = "action_sheet"
) -> Optional[str]:
    """Render a mobile action sheet"""
    sheet_html = f"""
    <div class="action-sheet-overlay {'active' if show else ''}" id="{key}_overlay">
        <div class="action-sheet" id="{key}">
    """
    
    for action in actions:
        sheet_html += f"""
        <button class="action-sheet-item {action.get('type', '')}" 
                onclick="handleActionSheet('{key}', '{action.get('id', '')}')">
            {f'<span class="action-icon">{action.get("icon", "")}</span>' if action.get('icon') else ''}
            <span class="action-label">{action.get('label', '')}</span>
        </button>
        """
    
    sheet_html += f"""
        <button class="action-sheet-item cancel" onclick="closeActionSheet('{key}')">
            Cancel
        </button>
    </div></div>
    """
    
    st.markdown(sheet_html, unsafe_allow_html=True)
    
    # Return selected action
    return st.session_state.get(f"{key}_selected")

# -----------------------------
# Mobile Search Component
# -----------------------------

def mobile_search_bar(
    placeholder: str = "Search...",
    value: str = "",
    suggestions: List[str] = None,
    key: str = "search"
) -> str:
    """Render a mobile-optimized search bar"""
    search_html = f"""
    <div class="mobile-search-container">
        <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input 
                type="search"
                id="{key}"
                class="mobile-search-input"
                placeholder="{placeholder}"
                value="{value}"
                autocomplete="off"
                oninput="handleSearch(this.value, '{key}')"
            />
            <button class="search-clear" onclick="clearSearch('{key}')" style="{'display: block' if value else 'display: none'}">
                ✕
            </button>
        </div>
    """
    
    if suggestions:
        search_html += f'<div class="search-suggestions" id="{key}_suggestions">'
        for suggestion in suggestions[:5]:  # Limit to 5 suggestions
            search_html += f"""
            <div class="search-suggestion" onclick="selectSuggestion('{key}', '{suggestion}')">
                {suggestion}
            </div>
            """
        search_html += '</div>'
    
    search_html += '</div>'
    
    st.markdown(search_html, unsafe_allow_html=True)
    
    return st.session_state.get(key, value)

# -----------------------------
# Mobile Tab Component
# -----------------------------


# -----------------------------
# Mobile Floating Action Button
# -----------------------------

def mobile_fab(
    icon: str = "+",
    actions: List[Dict[str, Any]] = None,
    key: str = "fab"
) -> Optional[str]:
    """Render a floating action button with optional speed dial"""
    fab_html = f"""
    <div class="fab-container" id="{key}_container">
        <button class="fab" id="{key}" onclick="toggleFAB('{key}')">
            <span class="fab-icon">{icon}</span>
        </button>
    """
    
    if actions:
        fab_html += f'<div class="fab-actions" id="{key}_actions">'
        for i, action in enumerate(actions):
            fab_html += f"""
            <button class="fab-action" 
                    onclick="handleFABAction('{key}', '{action.get('id', i)}')"
                    style="--delay: {i * 0.05}s">
                <span class="fab-action-icon">{action.get('icon', '')}</span>
                <span class="fab-action-label">{action.get('label', '')}</span>
            </button>
            """
        fab_html += '</div>'
    
    fab_html += '</div>'
    
    st.markdown(fab_html, unsafe_allow_html=True)
    
    return st.session_state.get(f"{key}_action")

# -----------------------------
# Mobile Progress Components
# -----------------------------

def mobile_progress_bar(
    value: float,
    max_value: float = 100,
    label: str = "",
    color: str = "primary",
    key: str = "progress"
) -> None:
    """Render a mobile-optimized progress bar"""
    percentage = (value / max_value) * 100 if max_value > 0 else 0
    
    progress_html = f"""
    <div class="mobile-progress-container">
        {f'<div class="progress-label">{label}</div>' if label else ''}
        <div class="progress-bar-wrapper">
            <div class="progress-bar {color}" style="width: {percentage}%"></div>
        </div>
        <div class="progress-text">{value}/{max_value}</div>
    </div>
    """
    
    st.markdown(progress_html, unsafe_allow_html=True)

def mobile_circular_progress(
    value: float,
    max_value: float = 100,
    size: int = 80,
    label: str = "",
    key: str = "circular_progress"
) -> None:
    """Render a circular progress indicator"""
    percentage = (value / max_value) * 100 if max_value > 0 else 0
    circumference = 2 * 3.14159 * 35  # radius = 35
    offset = circumference - (percentage / 100) * circumference
    
    progress_html = f"""
    <div class="circular-progress" style="width: {size}px; height: {size}px;">
        <svg width="{size}" height="{size}">
            <circle cx="{size/2}" cy="{size/2}" r="35" stroke="#e0e0e0" stroke-width="8" fill="none"/>
            <circle cx="{size/2}" cy="{size/2}" r="35" 
                    stroke="var(--primary-purple)" 
                    stroke-width="8" 
                    fill="none"
                    stroke-dasharray="{circumference}"
                    stroke-dashoffset="{offset}"
                    transform="rotate(-90 {size/2} {size/2})"
                    style="transition: stroke-dashoffset 0.3s ease;"/>
        </svg>
        <div class="circular-progress-text">
            <span class="progress-value">{int(percentage)}%</span>
            {f'<span class="progress-label">{label}</span>' if label else ''}
        </div>
    </div>
    """
    
    st.markdown(progress_html, unsafe_allow_html=True)

# -----------------------------
# Mobile Toast Notifications
# -----------------------------

def mobile_toast(
    message: str,
    type: str = "info",
    duration: int = 3000,
    action: Dict[str, Any] = None
) -> None:
    """Show a mobile toast notification"""
    toast_id = f"toast_{hash(message)}_{datetime.now().timestamp()}"
    
    toast_html = f"""
    <div class="mobile-toast {type}" id="{toast_id}">
        <div class="toast-content">
            <span class="toast-message">{message}</span>
            {f'<button class="toast-action" onclick="{action.get("onclick", "")}">{action.get("label", "")}</button>' if action else ''}
        </div>
    </div>
    
    <script>
    setTimeout(() => {{
        const toast = document.getElementById('{toast_id}');
        if (toast) {{
            toast.classList.add('show');
            setTimeout(() => {{
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }}, {duration});
        }}
    }}, 100);
    </script>
    """
    
    st.markdown(toast_html, unsafe_allow_html=True)

# -----------------------------
# Mobile Utility Functions
# -----------------------------

from pathlib import Path

def inject_mobile_styles() -> None:
    """Inject all mobile-specific CSS"""
    css_path = Path(__file__).resolve().parent / "theme.css"
    try:
        with open(css_path, "r") as f:
            mobile_css = f.read()
        st.markdown(f"<style>{mobile_css}</style>", unsafe_allow_html=True)
    except FileNotFoundError:
        st.warning("Mobile CSS file not found. Using fallback styles.")
        # Fallback minimal CSS
        fallback_css = """
        <style>
        .mobile-card { padding: 1rem; margin: 0.5rem 0; border: 1px solid #ddd; border-radius: 8px; }
        .touch-button { padding: 0.75rem 1.5rem; background: #6C4AB6; color: white; border: none; border-radius: 8px; cursor: pointer; }
        .mobile-input { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; }
        </style>
        """
        st.markdown(fallback_css, unsafe_allow_html=True)

def inject_mobile_scripts() -> None:
    """Inject all mobile-specific JavaScript"""
    try:
        with open("mobile_interactions.js", "r") as f:
            mobile_js = f.read()
    except FileNotFoundError:
        mobile_js = ""

    mobile_js += """
    function toggleMobileMenu() {
        const menu = document.getElementById('mobile-nav-menu');
        if (menu) {
            menu.classList.toggle('show');
        }
    }

    function selectMobileNav(tab) {
        window.parent.postMessage({
            type: 'streamlit:setComponentValue',
            key: 'top_nav',
            value: tab
        }, '*');
        toggleMobileMenu();
    }
    """

    st.markdown(f"<script>{mobile_js}</script>", unsafe_allow_html=True)

def detect_mobile() -> bool:
    """Detect if user is on mobile device"""
    # This is a simplified detection - you might want to use more sophisticated methods
    user_agent = st.session_state.get("user_agent", "")
    mobile_keywords = ["Mobile", "Android", "iPhone", "iPad", "iPod", "BlackBerry", "IEMobile"]
    
    return any(keyword in user_agent for keyword in mobile_keywords)

def get_viewport_size() -> Dict[str, int]:
    """Get current viewport size"""
    # This would need JavaScript integration to get actual values
    return {
        "width": st.session_state.get("viewport_width", 375),
        "height": st.session_state.get("viewport_height", 667)
    }

def mobile_safe_columns(
    spec: List[int],
    gap: str = "medium"
) -> List:
    """Create columns that stack on mobile"""
    if detect_mobile():
        # Return single column on mobile
        return [st.container() for _ in spec]
    else:
        # Return regular columns on desktop
        return st.columns(spec, gap=gap)

# -----------------------------
# Mobile State Management
# -----------------------------

def save_mobile_state(key: str, value: Any) -> None:
    """Save state that persists across mobile app sessions"""
    st.session_state[key] = value
    
    # Also save to localStorage for PWA
    js_code = f"""
    <script>
    localStorage.setItem('{key}', JSON.stringify({json.dumps(value)});
    </script>
    """
    st.markdown(js_code, unsafe_allow_html=True)

def load_mobile_state(key: str, default: Any = None) -> Any:
    """Load persisted mobile state"""
    # First check session state
    if key in st.session_state:
        return st.session_state[key]
    
    # Then check localStorage
    js_code = f"""
    <script>
    const value = localStorage.getItem('{key}');
    if (value) {{
        window.parent.postMessage({{
            type: 'streamlit:setComponentValue',
            key: '{key}',
            value: JSON.parse(value)
        }}, '*');
    }}
    </script>
    """
    st.markdown(js_code, unsafe_allow_html=True)
    
    return st.session_state.get(key, default)

# -----------------------------
# Mobile Performance Monitoring
# -----------------------------

def track_mobile_performance(metric: str, value: float) -> None:
    """Track mobile performance metrics"""
    if "mobile_metrics" not in st.session_state:
        st.session_state.mobile_metrics = {}
    
    st.session_state.mobile_metrics[metric] = value
    
    # Send to analytics if available
    js_code = f"""
    <script>
    if (window.gtag) {{
        gtag('event', 'mobile_performance', {{
            metric: '{metric}',
            value: {value}
        }});
    }}
    </script>
    """
    st.markdown(js_code, unsafe_allow_html=True)