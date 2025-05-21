import streamlit as st
from firebase_admin import firestore
from utils import format_date
import networkx as nx
from pyvis.network import Network
import tempfile
import os

db = firestore.client()

# ----------------------------
# 🏷 Explore Tags UI
# ----------------------------

def tag_explorer_ui():
    st.title("🔎 Explore Tags")

    search = st.text_input("Search for a tag")
    if not search:
        st.info("Enter a tag name to explore.")
        return

    tag = search.lower().strip()
    st.subheader(f"📌 Tag: `{tag}`")

    usage = _get_tag_usage(tag)
    st.write(f"Used in {len(usage['events'])} events, {len(usage['recipes'])} recipes, {len(usage['files'])} uploads")

    _render_constellation(tag, usage)

# ----------------------------
# 🔍 Tag Usage Fetcher
# ----------------------------

def _get_tag_usage(tag):
    usage = {
        "events": [],
        "recipes": [],
        "files": [],
        "receipts": [],
        "lists": []
    }

    for col, key in [("events", "events"), ("recipes", "recipes"), ("files", "files")]:
        docs = db.collection(col).where("tags", "array_contains", tag).stream()
        usage[key] = [doc.to_dict() for doc in docs]

    return usage

# ----------------------------
# 🌌 Visual Graph
# ----------------------------

def _render_constellation(tag, usage):
    G = nx.Graph()
    G.add_node(tag, title="This tag", size=30)

    for category, items in usage.items():
        for item in items:
            label = f"{category.title()}: {item.get('name', item.get('filename', 'Unnamed'))}"
            nid = item.get("id", label)
            G.add_node(nid, title=label, size=15)
            G.add_edge(tag, nid)

    net = Network(height="400px", bgcolor="#ffffff", font_color="black")
    net.from_nx(G)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".html") as f:
        net.save_graph(f.name)
        st.components.v1.html(open(f.name, "r").read(), height=420, scrolling=False)
        os.remove(f.name)
