import streamlit as st
from fpdf import FPDF
from io import BytesIO
from datetime import datetime
from events import get_all_events, get_event
from auth import require_role

# -------------------------------
# 🧾 Fake Event Data Loader (replace later)
# -------------------------------

def get_summary_data(event_id):
    # Placeholder - replace with actual Firestore queries
    return {
        "menu": ["Stuffed Peppers", "Wild Rice", "Kale Salad", "Peach Cobbler"],
        "schedule": [
            {"task": "Setup", "time": "10:00 AM"},
            {"task": "Cooking", "time": "11:30 AM"},
            {"task": "Service", "time": "1:00 PM"},
        ],
        "staff_notes": "Event went smoothly. Ran out of cobbler early.",
        "leftovers": "Minimal. 3 trays of wild rice remained.",
        "improvements": "Bring more dessert. Schedule more setup time.",
    }

# -------------------------------
# 🖨️ PDF Generation
# -------------------------------

class PDF(FPDF):
    def header(self):
        self.set_font("Arial", "B", 14)
        self.cell(0, 10, "Mountain Medicine Catering - Event Summary", ln=True, align="C")
        self.ln(5)

    def section_title(self, title):
        self.set_font("Arial", "B", 12)
        self.cell(0, 10, title, ln=True)
        self.ln(2)

    def section_body(self, content):
        self.set_font("Arial", "", 11)
        if isinstance(content, list):
            for item in content:
                self.cell(0, 8, f"- {item}", ln=True)
        elif isinstance(content, str):
            self.multi_cell(0, 8, content)
        elif isinstance(content, list) and isinstance(content[0], dict):
            for entry in content:
                self.cell(0, 8, f"{entry['time']}: {entry['task']}", ln=True)
        self.ln(4)

def generate_event_pdf(event, summary_data):
    pdf = PDF()
    pdf.add_page()

    pdf.set_font("Arial", "", 12)
    pdf.cell(0, 10, f"Event: {event['name']}", ln=True)
    pdf.cell(0, 10, f"Date: {event['date'].strftime('%b %d, %Y')}", ln=True)
    pdf.cell(0, 10, f"Location: {event['location']}", ln=True)
    pdf.cell(0, 10, f"Guest Count: {event['guest_count']}", ln=True)
    pdf.ln(5)

    pdf.section_title("Menu")
    pdf.section_body(summary_data["menu"])

    pdf.section_title("Schedule")
    pdf.section_body(summary_data["schedule"])

    pdf.section_title("Staff Notes")
    pdf.section_body(summary_data["staff_notes"])

    pdf.section_title("Leftovers / Overages")
    pdf.section_body(summary_data["leftovers"])

    pdf.section_title("Suggested Improvements")
    pdf.section_body(summary_data["improvements"])

    buffer = BytesIO()
    pdf.output(buffer)
    buffer.seek(0)
    return buffer

# -------------------------------
# 🖥️ Export UI
# -------------------------------

def pdf_export_ui(user):
    st.subheader("📄 Export Event Summaries (PDF)")

    if not require_role(user, "manager"):
        st.warning("You do not have permission to export event summaries.")
        return

    completed_events = [e for e in get_all_events() if e["status"] == "complete"]

    if not completed_events:
        st.info("No completed events found.")
        return

    selected = st.selectbox("Select Completed Event", completed_events, format_func=lambda e: e["name"])
    if selected:
        summary_data = get_summary_data(selected["id"])
        buffer = generate_event_pdf(selected, summary_data)

        st.download_button(
            label="⬇️ Download PDF",
            data=buffer,
            file_name=f"{selected['name'].replace(' ', '_')}_summary.pdf",
            mime="application/pdf"
        )
