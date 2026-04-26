from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime
import io

# 🎨 1. BRAND TOKENS (Matching your Dashboard)
PRIMARY = colors.HexColor("#6C5CE7") # Dashboard Purple
ACCENT = colors.HexColor("#00B894")  # Success Green
WARNING = colors.HexColor("#E17055") # Warning Orange
TEXT = colors.HexColor("#2D3436")
SUBTEXT = colors.HexColor("#636E72")
LIGHT_BG = colors.HexColor("#F3F0FF") # Soft Purple Background
BORDER = colors.HexColor("#E2E8F0")

# 📏 2. SPACING CONSTANTS
SECTION_GAP = 24
ITEM_GAP = 8
CARD_PADDING = 12

class RecoveryReportGenerator:
    def __init__(self, data):
        self.data = data
        self.buffer = io.BytesIO()
        self.styles = getSampleStyleSheet()
        self._setup_brand_styles()

    def _setup_brand_styles(self):
        # Header Styles
        self.styles.add(ParagraphStyle(
            name='HeaderBrand',
            fontSize=16,
            fontName='Helvetica-Bold',
            textColor=colors.white,
            alignment=TA_LEFT
        ))
        self.styles.add(ParagraphStyle(
            name='HeaderDate',
            fontSize=10,
            fontName='Helvetica',
            textColor=colors.white,
            alignment=TA_RIGHT
        ))

        # Hero Styles (Fixing Overlap)
        self.styles.add(ParagraphStyle(
            name='HeroScore',
            fontSize=64,
            fontName='Helvetica-Bold',
            textColor=ACCENT if self.data.get('adherence', 0) >= 80 else WARNING,
            alignment=TA_CENTER,
            leading=70, # Fixed overlap issue
            spaceBefore=20
        ))
        self.styles.add(ParagraphStyle(
            name='HeroLabel',
            fontSize=14,
            fontName='Helvetica-Bold',
            textColor=SUBTEXT,
            alignment=TA_CENTER,
            spaceAfter=20
        ))

        # Content Styles
        self.styles.add(ParagraphStyle(
            name='SectionTitle',
            fontSize=14,
            fontName='Helvetica-Bold',
            textColor=TEXT,
            spaceBefore=0,
            spaceAfter=ITEM_GAP
        ))
        
        self.styles.add(ParagraphStyle(
            name='CardLabel',
            fontSize=9,
            fontName='Helvetica-Bold',
            textColor=SUBTEXT,
            leading=12,
            textTransform='uppercase'
        ))

        self.styles.add(ParagraphStyle(
            name='PremiumBullet',
            fontSize=11,
            fontName='Helvetica',
            textColor=TEXT,
            leading=16,
            leftIndent=20,
            firstLineIndent=-15,
            spaceBefore=6
        ))

        self.styles.add(ParagraphStyle(
            name='AIBox',
            fontSize=11,
            fontName='Helvetica',
            textColor=TEXT,
            leading=18,
            backColor=LIGHT_BG,
            borderPadding=15,
            spaceBefore=10
        ))

    def generate(self):
        doc = SimpleDocTemplate(
            self.buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )
        elements = []

        # 🟣 1. BRANDED HEADER BAR
        header_data = [[
            Paragraph("MediCare+ Recovery Report", self.styles['HeaderBrand']),
            Paragraph(datetime.now().strftime("%d %b %Y"), self.styles['HeaderDate'])
        ]]
        header = Table(header_data, colWidths=[4.2*inch, 2.3*inch])
        header.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), PRIMARY),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 14),
            ('BOTTOMPADDING', (0,0), (-1,-1), 14),
            ('LEFTPADDING', (0,0), (-1,-1), 20),
            ('RIGHTPADDING', (0,0), (-1,-1), 20),
        ]))
        elements.append(header)
        elements.append(Spacer(1, SECTION_GAP))

        # 🧑‍⚕️ 2. PATIENT INFO GRID
        info_data = [
            [Paragraph("Patient Name", self.styles['CardLabel']), Paragraph(self.data.get('name', 'N/A'), self.styles['CardValue'])],
            [Paragraph("Report Period", self.styles['CardLabel']), Paragraph(self.data.get('period', 'Last 7 Days'), self.styles['CardValue'])],
            [Paragraph("Recovery Status", self.styles['CardLabel']), Paragraph("Active Recovery", ParagraphStyle('S', fontSize=12, fontName='Helvetica-Bold', textColor=ACCENT))]
        ]
        info_table = Table(info_data, colWidths=[1.8*inch, 4.6*inch])
        info_table.setStyle(TableStyle([
            ('LINEBELOW', (0,0), (-1,-2), 0.5, BORDER),
            ('TOPPADDING', (0,0), (-1,-1), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, SECTION_GAP))

        # 📊 3. HERO SCORE (No overlap)
        adherence = self.data.get('adherence', 0)
        total_doses = self.data.get('total', 0)
        
        if total_doses == 0:
            elements.append(Paragraph("No Data", self.styles['HeroScore']))
            elements.append(Paragraph("Insufficient data for adherence score", self.styles['HeroLabel']))
        else:
            elements.append(Paragraph(f"{adherence}%", self.styles['HeroScore']))
            elements.append(Paragraph("Adherence Consistency Score", self.styles['HeroLabel']))
        
        elements.append(Spacer(1, SECTION_GAP))

        # 📈 4. SUMMARY ROW
        summary_data = [[
            Paragraph(f"<font color='#00B894' size=18><b>{self.data.get('taken', 0)}</b></font><br/><font color='#636E72' size=9>Taken</font>", ParagraphStyle('C1', alignment=TA_CENTER, leading=18)),
            Paragraph(f"<font color='#E17055' size=18><b>{self.data.get('missed', 0)}</b></font><br/><font color='#636E72' size=9>Missed</font>", ParagraphStyle('C2', alignment=TA_CENTER, leading=18)),
            Paragraph(f"<font color='#2D3436' size=18><b>{self.data.get('total', 0)}</b></font><br/><font color='#636E72' size=9>Total</font>", ParagraphStyle('C3', alignment=TA_CENTER, leading=18))
        ]]
        summary_table = Table(summary_data, colWidths=[2.1*inch, 2.1*inch, 2.1*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
            ('BOX', (0,0), (-1,-1), 0.5, BORDER),
            ('TOPPADDING', (0,0), (-1,-1), 15),
            ('BOTTOMPADDING', (0,0), (-1,-1), 15),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, SECTION_GAP))

        # 💊 5. MEDICATION TABLE
        elements.append(Paragraph("Medication Details", self.styles['SectionTitle']))
        elements.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))
        
        med_header = [["Medicine", "Dosage", "Current Status"]]
        med_rows = []
        for med in self.data.get('medications', []):
            med_rows.append([
                med['name'], 
                med.get('dosage', 'As directed'),
                med['status']
            ])
        
        med_table = Table(med_header + med_rows, colWidths=[2.5*inch, 2*inch, 2*inch])
        med_table.setStyle(TableStyle([
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 10),
            ('TEXTCOLOR', (0,0), (-1,0), SUBTEXT),
            ('LINEBELOW', (0,0), (-1,0), 1, BORDER),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 0.25, colors.whitesmoke),
        ]))
        elements.append(med_table)
        elements.append(Spacer(1, SECTION_GAP))

        # 🧠 6. INSIGHTS & AI SUMMARY (Compact)
        elements.append(Paragraph("Recovery Insights", self.styles['SectionTitle']))
        elements.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))
        
        for insight in self.data.get('insights', []):
            elements.append(Paragraph(f"• {insight}", self.styles['PremiumBullet']))

        elements.append(Spacer(1, ITEM_GAP))
        summary_text = self.data.get('summary', "Maintaining good consistency.")
        elements.append(Paragraph(f"🌿 <b>AI RECOVERY SUMMARY:</b> {summary_text}", self.styles['AIBox']))

        # 💡 7. RECOMMENDATIONS
        elements.append(Spacer(1, SECTION_GAP))
        elements.append(Paragraph("Recommendations", self.styles['SectionTitle']))
        elements.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=8))
        for rec in self.data.get('recommendations', []):
            elements.append(Paragraph(f"• {rec}", self.styles['PremiumBullet']))

        # ⚪ 8. FOOTER
        elements.append(Spacer(1, 1*inch))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=SUBTEXT, spaceAfter=8))
        footer_data = [["Generated by MediCare+ AI Companion", "discharge-buddy.com"]]
        footer = Table(footer_data, colWidths=[3.2*inch, 3.2*inch])
        footer.setStyle(TableStyle([
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('TEXTCOLOR', (0,0), (-1,-1), SUBTEXT),
            ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ]))
        elements.append(footer)

        doc.build(elements)
        self.buffer.seek(0)
        return self.buffer.getvalue()
