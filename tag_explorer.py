import streamlit as st
import networkx as nx
from pyvis.network import Network
from utils import session_get

# ------------------------------
# 🔍 UI Entry Point
# ------------------------------
def tag_explorer_ui():
    st.title("🔖 Explore Tags")

    tag_query = st.text_input("Search for a tag:")
    if not tag_query:
        st.info("Enter a tag to explore usage across the app.")
        return

    try:
        tag_data = _get_tag_usage(tag_query.strip().lower()
        if not any(tag_data.values():
            st.warning("No usage found for this tag.")
            return
        _render_constellation(tag_query, tag_data)
    except Exception as e:
        st.error(f"An error occurred while loading tag data: {e}")


# ------------------------------
# 📊 Tag Usage Collector
# ------------------------------
def _get_tag_usage(tag: str) -> dict:
    tag_data = {
        "events": [],
        "recipes": [],
        "files": [],
        "shopping_lists": [],
        "equipment_lists": [],
        "receipts": []
    }

    collections = {
        "events": "events",
        "recipes": "recipes",
        "files": "files",
        "shopping_lists": "shopping_lists",
        "equipment_lists": "equipment_lists",
        "receipts": "receipts"
    }

    for key, collection in collections.items():
        try:
            docs = db.collection(collection).where("tags", "array_contains", tag).stream()
            tag_data[key] = [doc.to_dict() | {"id": doc.id} for doc in docs]
        except Exception:
            tag_data[key] = []  # Silently skip if collection missing or malformed

    return tag_data


# ------------------------------
# 🕸️ Tag Constellation Graph
# ------------------------------
def _render_constellation(tag: str, tag_data: dict):
    G = nx.Graph()
    main_node = tag
    G.add_node(main_node, size=25, title=f"Tag: {tag}")

    category_labels = {
        "events": "Event",
        "recipes": "Recipe",
        "files": "File",
        "shopping_lists": "Shopping List",
        "equipment_lists": "Equipment",
        "receipts": "Receipt"
    }

    for category, items in tag_data.items():
        label = category_labels.get(category, category.title()
        for entry in items:
            name = entry.get("name") or entry.get("title") or entry.get("id")
            tooltip = f"{label}: {name}"
            G.add_node(name, title=tooltip, size=15)
            G.add_edge(main_node, name)

    # Add usage summary node
    usage_summary = "<br>".join([
        f"{category_labels[k]}s: {len(v)}"
        for k, v in tag_data.items() if v
    ])
    G.nodes[main_node]['title'] += "<br><br>" + usage_summary

    net = Network(height="600px", width="100%", notebook=False)
    net.from_nx(G)
    net.repulsion(node_distance=220, spring_length=220)

    net.save_graph("tag_graph.html")
    with open("tag_graph.html", "r", encoding="utf-8") as f:
        html = f.read()
        st.components.v1.html(html, height=620, scrolling=False)
