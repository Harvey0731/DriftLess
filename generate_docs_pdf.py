"""
FocusBuddy (Driftless) - Product Documentation PDF Generator
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.units import inch, mm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, ListFlowable, ListItem,
    Image
)
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Rect, String, Circle, Line
from reportlab.graphics import renderPDF
import os

# ─── COLORS ────────────────────────────────────────────────────────
PURPLE = HexColor("#6C3CE1")
PURPLE_LIGHT = HexColor("#EDE5FF")
PURPLE_DARK = HexColor("#4A1FB8")
GREEN = HexColor("#22C55E")
GREEN_LIGHT = HexColor("#DCFCE7")
BLUE = HexColor("#3B82F6")
BLUE_LIGHT = HexColor("#DBEAFE")
ORANGE = HexColor("#F97316")
ORANGE_LIGHT = HexColor("#FED7AA")
YELLOW = HexColor("#EAB308")
YELLOW_LIGHT = HexColor("#FEF9C3")
GRAY = HexColor("#6B7280")
GRAY_LIGHT = HexColor("#F3F4F6")
GRAY_DARK = HexColor("#374151")
DARK_BG = HexColor("#1F2937")
WHITE = white
RED = HexColor("#EF4444")
RED_LIGHT = HexColor("#FEE2E2")

OUTPUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "FocusBuddy_Product_Documentation.pdf")

# ─── STYLES ────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    'DocTitle', parent=styles['Title'],
    fontSize=32, leading=38, textColor=PURPLE_DARK,
    spaceAfter=6, fontName='Helvetica-Bold',
))
styles.add(ParagraphStyle(
    'DocSubtitle', parent=styles['Normal'],
    fontSize=14, leading=18, textColor=GRAY,
    spaceAfter=30, fontName='Helvetica',
    alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    'H1', parent=styles['Heading1'],
    fontSize=22, leading=28, textColor=PURPLE_DARK,
    spaceBefore=24, spaceAfter=12, fontName='Helvetica-Bold',
    borderWidth=0, borderPadding=0,
))
styles.add(ParagraphStyle(
    'H2', parent=styles['Heading2'],
    fontSize=16, leading=22, textColor=GRAY_DARK,
    spaceBefore=18, spaceAfter=8, fontName='Helvetica-Bold',
))
styles.add(ParagraphStyle(
    'H3', parent=styles['Heading3'],
    fontSize=13, leading=18, textColor=PURPLE,
    spaceBefore=12, spaceAfter=6, fontName='Helvetica-Bold',
))
styles.add(ParagraphStyle(
    'Body', parent=styles['Normal'],
    fontSize=10.5, leading=16, textColor=GRAY_DARK,
    spaceAfter=8, fontName='Helvetica',
    alignment=TA_JUSTIFY,
))
styles.add(ParagraphStyle(
    'BodyBold', parent=styles['Normal'],
    fontSize=10.5, leading=16, textColor=GRAY_DARK,
    spaceAfter=8, fontName='Helvetica-Bold',
))
styles.add(ParagraphStyle(
    'BulletCustom', parent=styles['Normal'],
    fontSize=10.5, leading=16, textColor=GRAY_DARK,
    leftIndent=20, spaceAfter=4, fontName='Helvetica',
    bulletIndent=6, bulletFontSize=10,
))
styles.add(ParagraphStyle(
    'SubBullet', parent=styles['Normal'],
    fontSize=10, leading=15, textColor=GRAY,
    leftIndent=40, spaceAfter=3, fontName='Helvetica',
    bulletIndent=26, bulletFontSize=9,
))
styles.add(ParagraphStyle(
    'CalloutText', parent=styles['Normal'],
    fontSize=10.5, leading=16, textColor=PURPLE_DARK,
    spaceAfter=4, fontName='Helvetica',
))
styles.add(ParagraphStyle(
    'TableHeader', parent=styles['Normal'],
    fontSize=10, leading=14, textColor=WHITE,
    fontName='Helvetica-Bold', alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    'TableCell', parent=styles['Normal'],
    fontSize=9.5, leading=14, textColor=GRAY_DARK,
    fontName='Helvetica',
))
styles.add(ParagraphStyle(
    'TableCellCenter', parent=styles['Normal'],
    fontSize=9.5, leading=14, textColor=GRAY_DARK,
    fontName='Helvetica', alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    'Footer', parent=styles['Normal'],
    fontSize=8, leading=10, textColor=GRAY,
    fontName='Helvetica', alignment=TA_CENTER,
))
styles.add(ParagraphStyle(
    'TOCEntry', parent=styles['Normal'],
    fontSize=12, leading=20, textColor=GRAY_DARK,
    fontName='Helvetica', leftIndent=10,
))
styles.add(ParagraphStyle(
    'TOCSubEntry', parent=styles['Normal'],
    fontSize=10.5, leading=18, textColor=GRAY,
    fontName='Helvetica', leftIndent=30,
))
styles.add(ParagraphStyle(
    'Quote', parent=styles['Normal'],
    fontSize=12, leading=18, textColor=PURPLE,
    fontName='Helvetica-Oblique', alignment=TA_CENTER,
    spaceBefore=10, spaceAfter=10,
))


# ─── HELPER FUNCTIONS ──────────────────────────────────────────────

def colored_divider(color=PURPLE, width=480):
    return HRFlowable(width=width, thickness=2, color=color, spaceAfter=12, spaceBefore=4)

def thin_divider():
    return HRFlowable(width="100%", thickness=0.5, color=GRAY_LIGHT, spaceAfter=8, spaceBefore=8)

def callout_box(text, bg_color=PURPLE_LIGHT, text_color=PURPLE_DARK):
    data = [[Paragraph(text, ParagraphStyle('cb', parent=styles['Body'], textColor=text_color, fontSize=10.5, leading=16))]]
    t = Table(data, colWidths=[460])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_color),
        ('BOX', (0,0), (-1,-1), 0.5, text_color),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 14),
        ('RIGHTPADDING', (0,0), (-1,-1), 14),
        ('ROUNDEDCORNERS', (0,0), (-1,-1), [6,6,6,6]),
    ]))
    return t

def feature_table(headers, rows, col_widths=None):
    header_row = [Paragraph(h, styles['TableHeader']) for h in headers]
    data_rows = []
    for row in rows:
        data_rows.append([Paragraph(str(c), styles['TableCell']) for c in row])
    all_data = [header_row] + data_rows

    if col_widths is None:
        col_widths = [460 // len(headers)] * len(headers)

    t = Table(all_data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0,0), (-1,0), PURPLE),
        ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), WHITE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, GRAY_LIGHT]),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#E5E7EB")),
        ('TOPPADDING', (0,1), (-1,-1), 6),
        ('BOTTOMPADDING', (0,1), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]
    t.setStyle(TableStyle(style_cmds))
    return t

def bullet(text, style_name='Bullet'):
    return Paragraph(f"<bullet>&bull;</bullet> {text}", styles[style_name])

def sub_bullet(text):
    return Paragraph(f"<bullet>-</bullet> {text}", styles['SubBullet'])

def numbered_item(num, text):
    return Paragraph(f"<b>{num}.</b> {text}", styles['Bullet'])

# ─── PAGE TEMPLATES ────────────────────────────────────────────────

def cover_page(canvas_obj, doc):
    canvas_obj.saveState()
    w, h = letter

    # Purple gradient header
    for i in range(300):
        ratio = i / 300.0
        r = 0.42 * (1-ratio) + 0.29 * ratio
        g = 0.24 * (1-ratio) + 0.12 * ratio
        b = 0.88 * (1-ratio) + 0.72 * ratio
        canvas_obj.setStrokeColorRGB(r, g, b)
        canvas_obj.setLineWidth(1)
        canvas_obj.line(0, h - i, w, h - i)

    # App name
    canvas_obj.setFillColor(WHITE)
    canvas_obj.setFont('Helvetica-Bold', 48)
    canvas_obj.drawCentredString(w/2, h - 140, "FocusBuddy")

    canvas_obj.setFont('Helvetica', 20)
    canvas_obj.drawCentredString(w/2, h - 175, "by Driftless")

    # Tagline
    canvas_obj.setFont('Helvetica-Oblique', 16)
    canvas_obj.drawCentredString(w/2, h - 220, '"The app that gets you off the starting line"')

    # Decorative circles
    canvas_obj.setFillColor(HexColor("#FFFFFF20"))
    canvas_obj.setStrokeColor(HexColor("#FFFFFF30"))
    canvas_obj.circle(100, h - 80, 40, fill=0, stroke=1)
    canvas_obj.circle(w - 80, h - 200, 60, fill=0, stroke=1)
    canvas_obj.circle(w - 150, h - 60, 25, fill=0, stroke=1)

    # Document info box
    canvas_obj.setFillColor(WHITE)
    canvas_obj.roundRect(72, h - 480, w - 144, 160, 10, fill=1, stroke=0)

    canvas_obj.setFillColor(GRAY_DARK)
    canvas_obj.setFont('Helvetica-Bold', 14)
    canvas_obj.drawCentredString(w/2, h - 345, "Product Documentation")

    canvas_obj.setFillColor(GRAY)
    canvas_obj.setFont('Helvetica', 11)
    canvas_obj.drawCentredString(w/2, h - 370, "Complete Feature Guide & User Flow Reference")
    canvas_obj.drawCentredString(w/2, h - 390, "Version 1.0  |  March 2026")

    canvas_obj.setFillColor(PURPLE)
    canvas_obj.setFont('Helvetica', 10)
    canvas_obj.drawCentredString(w/2, h - 425, "React Native (Expo)  |  Supabase  |  AI-Powered Coaching")

    # Bottom bar
    canvas_obj.setFillColor(PURPLE_DARK)
    canvas_obj.rect(0, 0, w, 40, fill=1, stroke=0)
    canvas_obj.setFillColor(WHITE)
    canvas_obj.setFont('Helvetica', 9)
    canvas_obj.drawCentredString(w/2, 16, "Confidential  |  FocusBuddy by Driftless  |  All Rights Reserved")

    canvas_obj.restoreState()

def header_footer(canvas_obj, doc):
    canvas_obj.saveState()
    w, h = letter

    # Header line
    canvas_obj.setStrokeColor(PURPLE)
    canvas_obj.setLineWidth(1.5)
    canvas_obj.line(50, h - 40, w - 50, h - 40)

    canvas_obj.setFillColor(PURPLE)
    canvas_obj.setFont('Helvetica-Bold', 8)
    canvas_obj.drawString(50, h - 35, "FocusBuddy (Driftless)")

    canvas_obj.setFillColor(GRAY)
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.drawRightString(w - 50, h - 35, "Product Documentation v1.0")

    # Footer
    canvas_obj.setStrokeColor(GRAY_LIGHT)
    canvas_obj.setLineWidth(0.5)
    canvas_obj.line(50, 45, w - 50, 45)

    canvas_obj.setFillColor(GRAY)
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.drawCentredString(w/2, 30, f"Page {doc.page}")
    canvas_obj.drawString(50, 30, "Confidential")
    canvas_obj.drawRightString(w - 50, 30, "March 2026")

    canvas_obj.restoreState()


# ─── BUILD DOCUMENT ────────────────────────────────────────────────

def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=letter,
        topMargin=60,
        bottomMargin=60,
        leftMargin=65,
        rightMargin=65,
    )

    story = []

    # ═══════════════════════════════════════════════════════
    # COVER PAGE (blank placeholder; real cover via onPage)
    # ═══════════════════════════════════════════════════════
    story.append(Spacer(1, 500))
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════
    # TABLE OF CONTENTS
    # ═══════════════════════════════════════════════════════
    story.append(Paragraph("Table of Contents", styles['H1']))
    story.append(colored_divider())
    story.append(Spacer(1, 8))

    toc_items = [
        ("1", "What is FocusBuddy?"),
        ("2", "Who is it For?"),
        ("3", "Core Philosophy"),
        ("4", "Getting Started"),
        ("", "  Account Creation & Onboarding"),
        ("5", "Main Features"),
        ("", "  Daily Check-In & AI Task Breakdown"),
        ("", "  Focus Timer"),
        ("", "  AI Coach (Drift)"),
        ("", "  Promises & Trust Score"),
        ("", "  Progress & Statistics"),
        ("", "  Bad Day Toolbox"),
        ("", "  Streak System & Shields"),
        ("", "  Session Ratings"),
        ("6", "App Navigation & Screens"),
        ("7", "Settings & Preferences"),
        ("8", "Subscription & Billing"),
        ("9", "Data Privacy & Security"),
        ("10", "Data Export & Account Deletion"),
        ("11", "How It All Connects"),
        ("12", "Technical Overview"),
        ("13", "Glossary"),
    ]
    for num, title in toc_items:
        if num:
            story.append(Paragraph(f"<b>{num}.</b>&nbsp;&nbsp;{title}", styles['TOCEntry']))
        else:
            story.append(Paragraph(title, styles['TOCSubEntry']))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════
    # 1. WHAT IS FOCUSBUDDY?
    # ═══════════════════════════════════════════════════════
    story.append(Paragraph("1. What is FocusBuddy?", styles['H1']))
    story.append(colored_divider())

    story.append(Paragraph(
        "FocusBuddy (also known as Driftless) is a mobile application designed to help people overcome "
        "procrastination, get started on important tasks, and build consistent focus habits. Unlike traditional "
        "productivity apps that focus on task management and scheduling, FocusBuddy addresses the <b>emotional "
        "and psychological barriers</b> that prevent people from beginning their work.",
        styles['Body']
    ))
    story.append(Spacer(1, 6))
    story.append(callout_box(
        "<b>Core Mission:</b> FocusBuddy is the app that gets you off the starting line. "
        "It combines AI-powered coaching, structured accountability, and shame-free support to help "
        "users take that crucial first step every single day."
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("What Makes FocusBuddy Different?", styles['H3']))
    story.append(bullet("<b>Shame-Free Approach:</b> The app never uses phrases like \"you should have\" or \"why didn't you\" and instead meets users where they are with compassion and practical strategies."))
    story.append(bullet("<b>AI-Powered Daily Planning:</b> Every morning, an AI coach helps break down your goals into small, manageable tasks customized to how you are feeling that day."))
    story.append(bullet("<b>Accountability Without Guilt:</b> A unique Promise and Trust Score system helps you build reliability with yourself without punishment for bad days."))
    story.append(bullet("<b>Bad Day Support:</b> Dedicated tools and interventions for days when you simply cannot get started, including a shame-detection safety net."))
    story.append(bullet("<b>Focus Timer:</b> A dedicated distraction-free timer that tracks your actual focus time, not just task completion."))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════
    # 2. WHO IS IT FOR?
    # ═══════════════════════════════════════════════════════
    story.append(Paragraph("2. Who is it For?", styles['H1']))
    story.append(colored_divider())

    story.append(Paragraph(
        "FocusBuddy is built for anyone who struggles with getting started on tasks, but it is especially "
        "designed for people who experience:",
        styles['Body']
    ))
    story.append(Spacer(1, 6))

    audience_data = [
        ["Audience", "Challenge", "How FocusBuddy Helps"],
        ["People with ADHD", "Task initiation difficulty, time blindness, overwhelm", "AI breaks tasks into tiny steps; timer creates external structure"],
        ["Anxiety sufferers", "Perfectionism paralysis, fear of failure, overthinking", "Shame-free coaching; \"Good enough\" mindset; celebrates showing up"],
        ["Chronic procrastinators", "Avoidance cycles, guilt spirals, inconsistency", "Daily check-ins build routine; Trust Score tracks consistency gently"],
        ["Students", "Thesis/assignment paralysis, study avoidance", "Goal-based planning; session tracking; progress visualization"],
        ["Remote workers", "Self-discipline gaps, isolation, lack of accountability", "AI accountability partner; daily promises; streak motivation"],
    ]
    story.append(feature_table(
        audience_data[0], audience_data[1:],
        col_widths=[95, 170, 195]
    ))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════
    # 3. CORE PHILOSOPHY
    # ═══════════════════════════════════════════════════════
    story.append(Paragraph("3. Core Philosophy", styles['H1']))
    story.append(colored_divider())

    story.append(Paragraph(
        "FocusBuddy is built on several key principles that shape every feature and interaction:",
        styles['Body']
    ))

    principles = [
        ("<b>Starting is the Hardest Part:</b> The app focuses on reducing the friction of beginning, not optimizing workflows. If you open the app and do even five minutes of work, that is a win.",),
        ("<b>No Shame, Ever:</b> The AI coach (called Drift) is trained to never use judgmental language. It will never say \"you should\" or \"why didn't you\" or compare you to others. Every interaction is warm, supportive, and meets you where you are.",),
        ("<b>Small Steps Over Big Plans:</b> Instead of elaborate project plans, FocusBuddy breaks your one main goal into 2-5 tiny, doable tasks each morning based on your current energy level.",),
        ("<b>Consistency Over Perfection:</b> The streak and Trust Score systems reward showing up regularly, not achieving perfect productivity. A five-minute session counts just as much as a two-hour deep-work block.",),
        ("<b>Bad Days Are Expected:</b> The app includes dedicated tools for days when you cannot function normally, including Streak Shields that protect your streak when you need a rest day, and a Bad Day Toolbox with low-effort micro-activities.",),
        ("<b>Self-Trust Building:</b> The Promise system helps you gradually rebuild trust with yourself by making small daily commitments and tracking whether you keep them, creating a visible record of your reliability.",),
    ]
    for i, (text,) in enumerate(principles, 1):
        story.append(numbered_item(i, text))
        story.append(Spacer(1, 2))

    story.append(Spacer(1, 10))
    story.append(callout_box(
        "<b>The Drift Personality:</b> FocusBuddy's AI coach is named Drift. "
        "Drift speaks in a warm, casual tone. It celebrates small wins enthusiastically, "
        "offers gentle redirection when you are stuck, and never makes you feel bad about a rough day. "
        "Drift adapts its celebration style to your preference (Enthusiastic, Moderate, or Minimal).",
        BLUE_LIGHT, HexColor("#1E40AF")
    ))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════
    # 4. GETTING STARTED
    # ═══════════════════════════════════════════════════════
    story.append(Paragraph("4. Getting Started", styles['H1']))
    story.append(colored_divider())

    story.append(Paragraph("Account Creation", styles['H2']))
    story.append(Paragraph(
        "To start using FocusBuddy, you create an account with your email address and a password. "
        "The sign-up process collects your display name (how the app greets you), your email, and "
        "a password (minimum 8 characters). Once your account is created, you are guided through a "
        "three-step onboarding process.",
        styles['Body']
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph("Onboarding Flow (3 Steps)", styles['H2']))

    story.append(Paragraph("<b>Step 1: Set Your Main Goal</b>", styles['H3']))
    story.append(Paragraph(
        "You describe your one main, persistent goal in your own words. This is the thing you keep putting off "
        "or struggling to make progress on. Examples include \"Write my thesis,\" \"Launch my side project,\" "
        "or \"Study for the bar exam.\" The goal must be between 10 and 500 characters to ensure it is "
        "specific enough for the AI to help you break it down.",
        styles['Body']
    ))

    story.append(Paragraph("<b>Step 2: Choose Your Notification Time</b>", styles['H3']))
    story.append(Paragraph(
        "You select what hour of the day you would like to receive your daily check-in reminder. "
        "This is the time the app will nudge you to do your morning check-in and plan your tasks for the day. "
        "You can choose any hour from midnight to 11 PM.",
        styles['Body']
    ))

    story.append(Paragraph("<b>Step 3: Start Your Free Trial</b>", styles['H3']))
    story.append(Paragraph(
        "The final step activates your 7-day free trial. During the trial, you have full access to all "
        "features including unlimited AI coaching conversations, daily check-ins with AI task breakdowns, "
        "the focus timer, progress tracking, and all accountability features. After the trial, you can "
        "choose to upgrade to the Pro plan or continue with limited features.",
        styles['Body']
    ))

    story.append(Spacer(1, 12))

    # Onboarding flow diagram as a table
    flow_data = [
        [Paragraph("<b>Sign Up</b><br/>Name, Email, Password", styles['TableCellCenter']),
         Paragraph("-->", styles['TableCellCenter']),
         Paragraph("<b>Set Goal</b><br/>Your main focus area", styles['TableCellCenter']),
         Paragraph("-->", styles['TableCellCenter']),
         Paragraph("<b>Notification</b><br/>Pick reminder time", styles['TableCellCenter']),
         Paragraph("-->", styles['TableCellCenter']),
         Paragraph("<b>Free Trial</b><br/>7 days full access", styles['TableCellCenter']),
        ]
    ]
    flow_table = Table(flow_data, colWidths=[80, 20, 80, 20, 80, 20, 80])
    flow_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), PURPLE_LIGHT),
        ('BACKGROUND', (2,0), (2,0), PURPLE_LIGHT),
        ('BACKGROUND', (4,0), (4,0), PURPLE_LIGHT),
        ('BACKGROUND', (6,0), (6,0), GREEN_LIGHT),
        ('BOX', (0,0), (0,0), 0.5, PURPLE),
        ('BOX', (2,0), (2,0), 0.5, PURPLE),
        ('BOX', (4,0), (4,0), 0.5, PURPLE),
        ('BOX', (6,0), (6,0), 0.5, GREEN),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(flow_table)

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════
    # 5. MAIN FEATURES
    # ═══════════════════════════════════════════════════════
    story.append(Paragraph("5. Main Features", styles['H1']))
    story.append(colored_divider())

    # ── 5.1 Daily Check-In ──
    story.append(Paragraph("5.1 Daily Check-In & AI Task Breakdown", styles['H2']))
    story.append(thin_divider())
    story.append(Paragraph(
        "The Daily Check-In is the heart of FocusBuddy. Each day, you complete a brief check-in that "
        "assesses your current state and uses artificial intelligence to create a personalized task plan. "
        "The check-in is designed to take under two minutes and produces a clear, actionable plan for your day.",
        styles['Body']
    ))

    story.append(Paragraph("How the Check-In Works:", styles['H3']))
    story.append(numbered_item(1, "<b>Energy Check:</b> You select one of four energy levels: <b>Good</b> (ready to go), <b>Meh</b> (not great but functional), <b>Low</b> (struggling today), or <b>Need a Break</b> (cannot work today). Your selection affects the size and difficulty of tasks the AI suggests."))
    story.append(numbered_item(2, "<b>Goal Conversation:</b> The AI asks what you want to work on today. You describe your intention in your own words. If your description is too vague (for example, just one word like \"work\"), the AI will ask a follow-up question to help you get more specific. This back-and-forth can happen up to three times to ensure clarity."))
    story.append(numbered_item(3, "<b>Task Breakdown:</b> The AI generates 2 to 5 tasks based on your energy level and goal description. Each task includes a title, an estimated time in minutes, and a difficulty rating. If your energy is low, tasks are smaller and easier. If your energy is good, tasks may be more ambitious."))
    story.append(numbered_item(4, "<b>Task Review:</b> You can customize the plan before committing. You can toggle individual tasks on or off, tap \"Make Smaller\" to cut a task's estimated time in half and reduce its difficulty, or tap \"Try a Different Approach\" to have the AI regenerate tasks with a completely different strategy."))
    story.append(numbered_item(5, "<b>Optional Context:</b> You can select chips explaining why today feels hard (Unclear Start, Overwhelmed, Fear of Failure, Low Motivation). This information helps the AI tailor its approach."))
    story.append(numbered_item(6, "<b>Time Commitment:</b> You choose how long you want to focus today (15, 25, or 50 minutes, or a custom duration). Then you confirm and launch directly into the Focus Timer."))

    story.append(Spacer(1, 8))
    story.append(callout_box(
        "<b>\"Need a Break\" Flow:</b> If you select \"Need a Break\" as your energy level, the app does not force you "
        "to plan tasks. Instead, it shows a compassionate message (\"It's okay. Everyone needs a break.\") and offers "
        "two options: open the Bad Day Toolbox for low-effort activities, or take a Rest Day and use a Streak Shield "
        "to protect your streak.",
        ORANGE_LIGHT, HexColor("#9A3412")
    ))

    story.append(PageBreak())

    # ── 5.2 Focus Timer ──
    story.append(Paragraph("5.2 Focus Timer", styles['H2']))
    story.append(thin_divider())
    story.append(Paragraph(
        "The Focus Timer is a dedicated countdown timer that tracks your actual focus time on a specific task. "
        "Unlike a simple stopwatch, it is deeply integrated with your daily plan and provides persistence across "
        "app restarts.",
        styles['Body']
    ))

    story.append(Paragraph("Timer Features:", styles['H3']))
    story.append(bullet("<b>Countdown Display:</b> A large, clear countdown showing minutes and seconds remaining, along with the task name you are working on and the time you started."))
    story.append(bullet("<b>Pause and Resume:</b> You can pause the timer at any time and resume when ready. The app tracks how many times you paused during a session."))
    story.append(bullet("<b>Goal Reached Banner:</b> When your elapsed time meets or exceeds your planned duration, a celebratory banner appears encouraging you to keep going or wrap up."))
    story.append(bullet("<b>Crash Recovery:</b> If the app closes unexpectedly or your phone restarts, the timer automatically restores your session when you reopen the app. It uses device-level storage to remember your timer state and recalculates the correct elapsed time."))
    story.append(bullet("<b>Maximum Duration:</b> Sessions are capped at 8 hours to prevent runaway timers from accidentally recording inflated statistics."))
    story.append(bullet("<b>Quick Start:</b> You can also start a timer outside of the check-in flow by entering a task name and selecting a duration from the session tab."))

    story.append(Spacer(1, 8))

    story.append(Paragraph("Timer Flow:", styles['H3']))
    timer_flow = [
        ["Step", "What Happens"],
        ["Start", "You name your task and pick a duration (5, 25, 50 min or custom). A new session record is created."],
        ["Running", "The countdown ticks every second. Your elapsed time is tracked using actual clock timestamps, not simple counting, ensuring accuracy even if the app is backgrounded."],
        ["Pause", "Timer freezes. The pause is recorded in the database. You can resume at any time."],
        ["End", "You tap End Session. The app navigates you to the Session Rating screen to reflect on how it went."],
        ["Recovery", "If the app was force-closed, on next open it checks for any unfinished sessions and restores the timer to the correct position."],
    ]
    story.append(feature_table(timer_flow[0], timer_flow[1:], col_widths=[70, 390]))

    story.append(PageBreak())

    # ── 5.3 AI Coach ──
    story.append(Paragraph("5.3 AI Coach (Drift)", styles['H2']))
    story.append(thin_divider())
    story.append(Paragraph(
        "Drift is FocusBuddy's built-in AI coaching companion. Available through the Chat tab, Drift provides "
        "ongoing conversational support throughout your day. Drift is not a generic chatbot; it is specifically "
        "trained to help with procrastination, task initiation, and emotional barriers to productivity.",
        styles['Body']
    ))

    story.append(Paragraph("What Drift Can Help With:", styles['H3']))
    story.append(bullet("<b>Getting Unstuck:</b> When you do not know where to start, Drift helps you identify the single smallest first step."))
    story.append(bullet("<b>Emotional Support:</b> Drift recognizes frustration, anxiety, and self-criticism, responding with empathy rather than advice."))
    story.append(bullet("<b>Task Strategies:</b> Drift suggests different approaches to tackle your work, adapted to your energy and situation."))
    story.append(bullet("<b>Celebration:</b> After completing sessions, Drift celebrates your wins in your preferred style (Enthusiastic, Moderate, or Minimal)."))
    story.append(bullet("<b>Reflection:</b> Drift helps you process difficult sessions and learn from struggles without self-blame."))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Drift's Personality Rules:", styles['H3']))
    story.append(bullet("Never says \"you should,\" \"you need to,\" \"just do it,\" or \"why didn't you\""))
    story.append(bullet("Never compares you to other people or productivity standards"))
    story.append(bullet("Always acknowledges effort, even if the result was not what you hoped"))
    story.append(bullet("Adapts language to your chosen celebration style"))
    story.append(bullet("Understands ADHD, anxiety, and procrastination patterns"))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Context Awareness:", styles['H3']))
    story.append(Paragraph(
        "Drift does not operate in a vacuum. Every time you send a message, Drift automatically receives "
        "context about your current goal, today's check-in results, your recent focus sessions, your "
        "promise status, and your profile preferences. This allows Drift to give specific, relevant advice "
        "rather than generic motivation.",
        styles['Body']
    ))

    story.append(Spacer(1, 6))
    story.append(callout_box(
        "<b>Shame Detection Safety Net:</b> If Drift detects self-critical language in your messages "
        "(such as \"I'm so lazy,\" \"I'm broken,\" or \"I'll never be good enough\"), it triggers a "
        "full-screen Shame Emergency intervention. This screen shows compassionate reframing messages "
        "and offers resources, interrupting the negative thought spiral before it deepens.",
        RED_LIGHT, HexColor("#991B1B")
    ))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Chat Features:", styles['H3']))
    story.append(bullet("<b>Message History:</b> All conversations are saved and paginated (20 messages at a time) so you can scroll back through past coaching sessions."))
    story.append(bullet("<b>Quick Actions:</b> Preset message suggestions you can tap to quickly start common conversations."))
    story.append(bullet("<b>Delete Messages:</b> You can delete individual messages from your history."))
    story.append(bullet("<b>Rate Limiting:</b> To ensure quality responses and prevent abuse, chat is limited to 100 messages per hour."))

    story.append(PageBreak())

    # ── 5.4 Promises & Trust Score ──
    story.append(Paragraph("5.4 Promises & Trust Score", styles['H2']))
    story.append(thin_divider())
    story.append(Paragraph(
        "The Promise system is one of FocusBuddy's most unique features. It helps you rebuild trust with "
        "yourself by making small, specific daily commitments and honestly tracking whether you kept them.",
        styles['Body']
    ))

    story.append(Paragraph("How Promises Work:", styles['H3']))
    story.append(numbered_item(1, "<b>Set a Promise:</b> Each day, you write one specific promise to yourself. It should be small and achievable, for example: \"I will open my laptop at 10am\" or \"I will work on chapter 3 for 15 minutes.\" Example suggestions are provided as quick-tap chips."))
    story.append(numbered_item(2, "<b>Keep or Break:</b> Later in the day, you honestly report whether you kept your promise. The app asks: \"Did you keep your promise?\" with simple Yes/No buttons."))
    story.append(numbered_item(3, "<b>Reason Tracking:</b> If you did not keep your promise, you select a reason: \"Too big\" (overcommitted), \"Forgot,\" \"Life happened\" (external events), or \"Just couldn't\" (internal barriers). This data helps you understand your patterns over time."))
    story.append(numbered_item(4, "<b>Weekly History:</b> The Promises screen shows your last 7 days of promises with their status, creating a visual record of your consistency."))

    story.append(Spacer(1, 8))
    story.append(Paragraph("Trust Score", styles['H3']))
    story.append(Paragraph(
        "Your Trust Score is a number from 0 to 100 that reflects how reliable you have been with your promises "
        "to yourself. It is displayed as a prominent widget on the Home screen and the Promises screen.",
        styles['Body']
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph("The Trust Score formula weighs three factors:", styles['Body']))
    story.append(bullet("<b>60% - Promise Kept Ratio:</b> The percentage of your promises that you kept over the tracking period."))
    story.append(bullet("<b>20% - Streak Bonus:</b> A bonus for consecutive days of keeping promises, rewarding consistency."))
    story.append(bullet("<b>20% - 30-Day Activity Bonus:</b> A bonus for regularly making promises over the last 30 days, rewarding engagement."))

    story.append(Spacer(1, 6))
    trust_labels = [
        ["Score Range", "Label", "Meaning"],
        ["80-100", "Strong", "You follow through on most commitments to yourself"],
        ["60-79", "Building", "You are developing consistency and making progress"],
        ["40-59", "Growing", "You are starting to build the habit of self-trust"],
        ["0-39", "Starting", "Every kept promise moves you forward"],
    ]
    story.append(feature_table(trust_labels[0], trust_labels[1:], col_widths=[80, 80, 300]))

    story.append(PageBreak())

    # ── 5.5 Progress & Statistics ──
    story.append(Paragraph("5.5 Progress & Statistics", styles['H2']))
    story.append(thin_divider())
    story.append(Paragraph(
        "The Progress tab gives you a visual overview of your focus habits over time. It helps you see "
        "patterns, celebrate milestones, and stay motivated with clear evidence of your consistency.",
        styles['Body']
    ))

    story.append(Paragraph("Time Period Views:", styles['H3']))
    story.append(bullet("<b>This Week:</b> Shows daily focus time for the current week with a bar chart"))
    story.append(bullet("<b>This Month:</b> Aggregated statistics for the current month"))
    story.append(bullet("<b>All Time:</b> Your complete history since joining"))

    story.append(Spacer(1, 4))
    story.append(Paragraph("Statistics Displayed:", styles['H3']))
    story.append(bullet("<b>Total Focus Hours:</b> Combined time from all completed sessions, with a trend comparison to the previous period"))
    story.append(bullet("<b>Session Count:</b> How many focus sessions you have completed, with period-over-period comparison"))
    story.append(bullet("<b>Average Duration:</b> Your typical session length, showing whether your focus endurance is growing"))
    story.append(bullet("<b>Weekly Chart:</b> A color-coded bar chart showing daily focus minutes. Bars are colored differently for sessions under and over 25 minutes, with an average line overlay"))
    story.append(bullet("<b>Rating Breakdown:</b> A distribution of your session ratings (Great, Good, OK, Struggled) showing how your sessions typically feel"))
    story.append(bullet("<b>Insights:</b> Your best day of the week, average session duration, and totals"))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Milestones", styles['H3']))
    story.append(Paragraph(
        "FocusBuddy tracks achievement milestones that celebrate your cumulative progress:",
        styles['Body']
    ))
    milestones = [
        ["Milestone", "Requirement", "Status Display"],
        ["First Session", "Complete 1 focus session", "Gold star when earned"],
        ["10 Sessions", "Complete 10 focus sessions", "Gold star when earned"],
        ["25 Sessions", "Complete 25 focus sessions", "Gold star when earned"],
        ["10 Hours", "Accumulate 10 total focus hours", "Gold star when earned"],
        ["50 Hours", "Accumulate 50 total focus hours", "Gold star when earned"],
    ]
    story.append(feature_table(milestones[0], milestones[1:], col_widths=[100, 200, 160]))

    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Unearned milestones show as locked with a question mark. Milestones currently in progress show a "
        "tilde symbol. This gives you clear targets to work toward without creating pressure.",
        styles['Body']
    ))

    story.append(PageBreak())

    # ── 5.6 Bad Day Toolbox ──
    story.append(Paragraph("5.6 Bad Day Toolbox", styles['H2']))
    story.append(thin_divider())
    story.append(Paragraph(
        "The Bad Day Toolbox is a curated collection of low-effort micro-activities designed for days when you "
        "simply cannot bring yourself to do your main work. Instead of forcing productivity, it offers "
        "alternative actions that still move you forward in small ways or help you take care of yourself.",
        styles['Body']
    ))

    story.append(Paragraph("Activity Categories:", styles['H3']))
    categories = [
        ["Category", "Purpose", "Example Activities"],
        ["Physical", "Get your body moving to shift your mental state", "Take a 5-minute walk, stretch at your desk, do 10 jumping jacks"],
        ["Work", "Tiny work-adjacent tasks that feel less intimidating", "Organize your desk, reply to one easy email, open the document you have been avoiding"],
        ["Comfort", "Self-care activities that restore energy", "Make a cup of tea, listen to a favorite song, sit outside for 5 minutes"],
        ["Tomorrow", "Set up future success without doing hard work now", "Lay out tomorrow's clothes, write tomorrow's first task, set a reminder"],
    ]
    story.append(feature_table(categories[0], categories[1:], col_widths=[70, 160, 230]))

    story.append(Spacer(1, 6))
    story.append(Paragraph("How It Works:", styles['H3']))
    story.append(numbered_item(1, "Browse activities by category using the horizontal scroll tabs"))
    story.append(numbered_item(2, "Each activity card shows a title, description, estimated time, and difficulty badge (Very Easy, Easy, or Medium)"))
    story.append(numbered_item(3, "Tap \"I'll Do This\" on an activity that feels manageable"))
    story.append(numbered_item(4, "After attempting, tap \"Done\" or \"Couldn't Do It\""))
    story.append(numbered_item(5, "If you could not do it, the app suggests an even simpler fallback activity"))

    story.append(PageBreak())

    # ── 5.7 Streak System ──
    story.append(Paragraph("5.7 Streak System & Shields", styles['H2']))
    story.append(thin_divider())
    story.append(Paragraph(
        "FocusBuddy uses a streak system to encourage daily consistency. Your streak counts consecutive "
        "days where you completed a check-in, giving you a visible measure of your commitment.",
        styles['Body']
    ))

    story.append(Paragraph("How Streaks Work:", styles['H3']))
    story.append(bullet("<b>Building a Streak:</b> Each day you complete a check-in, your current streak increases by one. If you miss a day, your streak resets to zero."))
    story.append(bullet("<b>Current Streak:</b> Displayed on the Home screen, showing your ongoing consecutive-day count."))
    story.append(bullet("<b>Longest Streak:</b> Your all-time best streak is recorded and displayed in your profile, giving you a personal record to beat."))
    story.append(bullet("<b>Timezone Awareness:</b> The streak system uses your local timezone to determine \"today\" and \"yesterday,\" so it works correctly regardless of where you are in the world."))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Streak Shields", styles['H3']))
    story.append(Paragraph(
        "Recognizing that everyone has bad days, FocusBuddy provides up to <b>3 Streak Shields</b>. "
        "A Streak Shield protects your streak when you need to take a rest day, preventing a single "
        "bad day from wiping out weeks of consistency.",
        styles['Body']
    ))
    story.append(bullet("You start with a small number of shields"))
    story.append(bullet("Using a shield during the \"Need a Break\" check-in flow preserves your streak for that day"))
    story.append(bullet("Shields are consumed atomically (safely, one at a time) to prevent accidental double-use"))
    story.append(bullet("Your remaining shield count is visible in your profile"))

    story.append(Spacer(1, 8))
    # ── 5.8 Session Ratings ──
    story.append(Paragraph("5.8 Session Ratings", styles['H2']))
    story.append(thin_divider())
    story.append(Paragraph(
        "After every focus session, you rate how it went. This is not about judging yourself; it is about "
        "building self-awareness and helping the app understand your patterns.",
        styles['Body']
    ))

    ratings = [
        ["Rating", "Label", "Color", "What It Means"],
        ["Great", "Nailed It", "Green", "You were in the zone and felt productive"],
        ["Good", "Solid", "Blue", "A steady, focused session"],
        ["OK", "Got Started", "Yellow", "You showed up even if it was not perfect"],
        ["Struggled", "Showed Up Anyway", "Orange", "It was hard but you still tried (this counts!)"],
    ]
    story.append(feature_table(ratings[0], ratings[1:], col_widths=[55, 80, 55, 270]))

    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "Notice how every rating label is positive: even \"Struggled\" is labeled \"Showed Up Anyway,\" "
        "reinforcing that the act of trying has value. If you rate a session as Struggled, the app offers "
        "a prompt to talk about it with Drift, your AI coach.",
        styles['Body']
    ))
    story.append(Paragraph(
        "You can also add an optional text note (up to 500 characters) to capture your reflections on the session.",
        styles['Body']
    ))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════
    # 6. APP NAVIGATION & SCREENS
    # ═══════════════════════════════════════════════════════
    story.append(Paragraph("6. App Navigation & Screens", styles['H1']))
    story.append(colored_divider())

    story.append(Paragraph(
        "FocusBuddy uses a bottom tab navigation with five main sections and a prominent center button "
        "for starting focus sessions.",
        styles['Body']
    ))

    story.append(Paragraph("Main Tabs:", styles['H3']))
    tabs = [
        ["Tab", "Icon", "Purpose"],
        ["Home", "House", "Your daily dashboard: greeting, goal, stats, quick actions, activity feed"],
        ["Progress", "Chart", "Statistics, charts, milestones, session history"],
        ["Session (+)", "Plus button", "Start a new focus timer (center button, visually prominent)"],
        ["Chat", "Message bubble", "Conversation with Drift, your AI coach"],
        ["Settings", "Gear", "Profile, preferences, subscription, data management"],
    ]
    story.append(feature_table(tabs[0], tabs[1:], col_widths=[80, 90, 290]))

    story.append(Spacer(1, 10))
    story.append(Paragraph("Additional Screens:", styles['H3']))
    screens = [
        ["Screen", "Accessed From", "Purpose"],
        ["Daily Check-In", "Home tab prompt", "Morning energy check and AI task planning"],
        ["Timer", "Check-in completion or Session tab", "Active focus countdown with pause/resume"],
        ["Session Rating", "Ending a timer session", "Rate and reflect on completed session"],
        ["Promises", "Home quick actions", "Set daily promises and track trust score"],
        ["Bad Day Toolbox", "Home quick actions or check-in", "Low-effort micro-activities for hard days"],
        ["Shame Emergency", "Triggered by chat AI", "Full-screen compassion intervention"],
        ["Edit Profile", "Settings tab", "Update display name and preferences"],
        ["Paywall", "Settings or trial expiration", "Subscription upgrade options"],
        ["Data Export", "Settings tab", "Download your personal data"],
        ["Delete Account", "Settings tab", "Permanently remove your account and data"],
    ]
    story.append(feature_table(screens[0], screens[1:], col_widths=[110, 145, 205]))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════
    # 7. SETTINGS & PREFERENCES
    # ═══════════════════════════════════════════════════════
    story.append(Paragraph("7. Settings & Preferences", styles['H1']))
    story.append(colored_divider())

    story.append(Paragraph(
        "The Settings screen lets you customize your FocusBuddy experience and manage your account.",
        styles['Body']
    ))

    story.append(Paragraph("Profile Settings:", styles['H3']))
    story.append(bullet("<b>Display Name:</b> How the app greets you each day"))
    story.append(bullet("<b>Procrastination Type:</b> Helps the AI tailor its coaching approach to your specific patterns"))

    story.append(Paragraph("Preferences:", styles['H3']))
    story.append(bullet("<b>Notification Time:</b> When you receive your daily check-in reminder"))
    story.append(bullet("<b>Default Session Length:</b> Your preferred timer duration (15, 25, or 50 minutes, or custom). Saved locally so it persists between sessions"))
    story.append(bullet("<b>Celebration Style:</b> How enthusiastically the AI celebrates your wins. Options: Enthusiastic (lots of encouragement), Moderate (balanced), or Minimal (brief acknowledgment)"))
    story.append(bullet("<b>Theme:</b> Visual appearance of the app: Light mode, Dark mode, or Auto (follows your device setting)"))

    story.append(Paragraph("Privacy Settings:", styles['H3']))
    story.append(bullet("<b>Anonymous Sharing:</b> Toggle whether any anonymized usage data is shared"))
    story.append(bullet("<b>Analytics:</b> Toggle whether error tracking and performance monitoring are active. When disabled, the app stops sending crash reports"))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Account Actions:", styles['H3']))
    story.append(bullet("<b>Sign Out:</b> Logs you out of the app with a confirmation dialog"))
    story.append(bullet("<b>Delete Account:</b> Permanently removes your account and all associated data (see Section 10)"))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════
    # 8. SUBSCRIPTION & BILLING
    # ═══════════════════════════════════════════════════════
    story.append(Paragraph("8. Subscription & Billing", styles['H1']))
    story.append(colored_divider())

    story.append(Paragraph(
        "FocusBuddy uses a freemium model with a free trial for new users and a Pro subscription for "
        "continued full access.",
        styles['Body']
    ))

    sub_tiers = [
        ["Plan", "Access", "Details"],
        ["Free Trial", "Full access to all features for 7 days", "Starts automatically during onboarding; no credit card required to begin"],
        ["Pro", "Unlimited access to all features", "Monthly subscription managed through the App Store; includes unlimited AI coaching, daily check-ins, and all features"],
        ["Free", "Limited features after trial expires", "Basic access with restricted AI interactions"],
    ]
    story.append(feature_table(sub_tiers[0], sub_tiers[1:], col_widths=[70, 195, 195]))

    story.append(Spacer(1, 8))
    story.append(Paragraph("Subscription Management:", styles['H3']))
    story.append(bullet("<b>Current Plan Display:</b> The Settings screen shows your current plan (Free, Pro, or Free Trial) along with your trial end date or renewal date"))
    story.append(bullet("<b>Upgrade:</b> A prominent Upgrade button opens the paywall screen with plan details"))
    story.append(bullet("<b>Manage Subscription:</b> Links directly to the Apple App Store subscription management page"))
    story.append(bullet("<b>Restore Purchases:</b> If you reinstall the app or switch devices, this button recovers your existing subscription"))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Subscription Status Types:", styles['H3']))
    sub_statuses = [
        ["Status", "Meaning"],
        ["Trialing", "User is within their 7-day free trial period"],
        ["Active", "Subscription is paid and current"],
        ["Cancelled", "User cancelled but access continues until period end"],
        ["Expired", "Subscription period ended without renewal"],
        ["Billing Issue", "Payment failed; user should update payment method"],
        ["Revoked", "Subscription was refunded by the app store"],
    ]
    story.append(feature_table(sub_statuses[0], sub_statuses[1:], col_widths=[100, 360]))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════
    # 9. DATA PRIVACY & SECURITY
    # ═══════════════════════════════════════════════════════
    story.append(Paragraph("9. Data Privacy & Security", styles['H1']))
    story.append(colored_divider())

    story.append(Paragraph(
        "FocusBuddy takes data privacy and security seriously. Here is how your data is protected:",
        styles['Body']
    ))

    story.append(Paragraph("Data Ownership & Access Control:", styles['H3']))
    story.append(bullet("<b>Row-Level Security:</b> Every piece of data in the database is protected by security rules that ensure you can only access your own data. No user can ever see another user's sessions, messages, goals, or check-ins."))
    story.append(bullet("<b>Ownership Verification:</b> Every database query includes a user identity check, ensuring data can only be read or modified by its owner."))
    story.append(bullet("<b>Secure Authentication:</b> Your login credentials are handled by industry-standard authentication with encrypted token storage on your device."))

    story.append(Paragraph("AI & Chat Security:", styles['H3']))
    story.append(bullet("<b>Prompt Injection Protection:</b> User messages sent to the AI are sanitized to prevent malicious instructions from being injected into the AI system."))
    story.append(bullet("<b>Rate Limiting:</b> Chat is limited to 100 messages per hour and check-ins are limited to 10 per hour to prevent abuse."))
    story.append(bullet("<b>No Data Sharing:</b> Your conversations with Drift are private and are not used to train AI models."))

    story.append(Paragraph("Payment Security:", styles['H3']))
    story.append(bullet("<b>Webhook Verification:</b> All payment events from the app store are cryptographically verified to prevent spoofed transactions."))
    story.append(bullet("<b>No Card Storage:</b> FocusBuddy never sees or stores your credit card information. All payments are processed through the App Store."))

    story.append(Paragraph("Error Monitoring:", styles['H3']))
    story.append(bullet("<b>Privacy-Aware Logging:</b> Error monitoring scrubs authentication headers and sensitive data before sending reports. No personal content from your messages or goals is included in error reports."))
    story.append(bullet("<b>User Control:</b> You can disable analytics entirely from Settings, which stops all error reporting."))

    story.append(Paragraph("Inactivity Protection:", styles['H3']))
    story.append(bullet("Accounts are automatically logged out after 30 days of inactivity to protect unattended devices."))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════
    # 10. DATA EXPORT & ACCOUNT DELETION
    # ═══════════════════════════════════════════════════════
    story.append(Paragraph("10. Data Export & Account Deletion", styles['H1']))
    story.append(colored_divider())

    story.append(Paragraph("Data Export", styles['H2']))
    story.append(Paragraph(
        "In compliance with data portability regulations (such as GDPR Article 20), FocusBuddy allows you to "
        "export all of your personal data at any time. The export includes your profile information, goals, "
        "check-ins, tasks, focus sessions, chat messages, promises, milestones, and subscription details. "
        "Data is provided in a structured, machine-readable format. Exports are capped at 10,000 rows per "
        "data category to ensure the process completes reliably.",
        styles['Body']
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph("Account Deletion", styles['H2']))
    story.append(Paragraph(
        "You have the right to permanently delete your account and all associated data at any time. The deletion "
        "process requires explicit confirmation and performs the following actions:",
        styles['Body']
    ))
    story.append(bullet("Signs you out of all active sessions across all devices"))
    story.append(bullet("Removes all personal data from the database (profile, goals, sessions, messages, promises, check-ins, tasks, milestones, subscription records)"))
    story.append(bullet("Deletes your authentication credentials"))
    story.append(bullet("This action is permanent and cannot be undone"))

    story.append(Spacer(1, 6))
    story.append(callout_box(
        "<b>Important:</b> If you have an active App Store subscription, deleting your FocusBuddy account "
        "does not automatically cancel your subscription. You should cancel your subscription through the App Store "
        "before deleting your account to avoid continued billing.",
        YELLOW_LIGHT, HexColor("#854D0E")
    ))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════
    # 11. HOW IT ALL CONNECTS
    # ═══════════════════════════════════════════════════════
    story.append(Paragraph("11. How It All Connects - The Daily Flow", styles['H1']))
    story.append(colored_divider())

    story.append(Paragraph(
        "Here is how a typical day with FocusBuddy looks, showing how all the features work together:",
        styles['Body']
    ))

    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>Morning</b>", styles['H3']))
    story.append(numbered_item(1, "<b>Notification:</b> You receive a reminder at your chosen time to check in."))
    story.append(numbered_item(2, "<b>Check-In:</b> You open the app, select your energy level, describe what you want to work on, and the AI generates 2-5 tailored tasks."))
    story.append(numbered_item(3, "<b>Promise:</b> You set a small daily promise to yourself (\"I will work on the introduction for 15 minutes\")."))
    story.append(numbered_item(4, "<b>Focus Session:</b> You start the timer on your first task. The countdown runs while you work."))

    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>During Work</b>", styles['H3']))
    story.append(numbered_item(5, "<b>Pause if Needed:</b> You can pause the timer for breaks and resume when ready."))
    story.append(numbered_item(6, "<b>Chat with Drift:</b> If you get stuck or need encouragement, open the Chat tab for AI coaching."))
    story.append(numbered_item(7, "<b>Complete Session:</b> When your timer runs out (or you decide to stop), you end the session."))
    story.append(numbered_item(8, "<b>Rate Session:</b> You rate how it went (Great, Good, OK, or Struggled) and optionally add a reflection note."))

    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Evening</b>", styles['H3']))
    story.append(numbered_item(9, "<b>Resolve Promise:</b> You check whether you kept your daily promise. Your Trust Score updates accordingly."))
    story.append(numbered_item(10, "<b>Streak Update:</b> Your consecutive-day streak increases, and your progress stats update."))

    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Bad Day Alternative</b>", styles['H3']))
    story.append(Paragraph(
        "If you wake up feeling unable to work, you select \"Need a Break\" during check-in. "
        "The app offers the Bad Day Toolbox with micro-activities, or you can use a Streak Shield "
        "to take a rest day without losing your streak. There is no judgment and no penalty.",
        styles['Body']
    ))

    story.append(Spacer(1, 10))
    # Visual flow
    flow_items = [
        ("Check-In", PURPLE_LIGHT, PURPLE),
        ("AI Tasks", BLUE_LIGHT, BLUE),
        ("Focus Timer", GREEN_LIGHT, GREEN),
        ("Rate Session", ORANGE_LIGHT, ORANGE),
        ("Track Promise", YELLOW_LIGHT, YELLOW),
    ]
    flow_cells = []
    for label, bg, border in flow_items:
        flow_cells.append(Paragraph(f"<b>{label}</b>", ParagraphStyle('fc', parent=styles['TableCellCenter'], fontSize=9)))
    arrows = [Paragraph("->", styles['TableCellCenter']) for _ in range(4)]
    row = []
    for i, cell in enumerate(flow_cells):
        row.append(cell)
        if i < 4:
            row.append(arrows[i])
    ft = Table([row], colWidths=[75, 20, 75, 20, 75, 20, 85, 20, 85])
    style_cmds = [('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('TOPPADDING', (0,0), (-1,-1), 8), ('BOTTOMPADDING', (0,0), (-1,-1), 8)]
    for i, (_, bg, border) in enumerate(flow_items):
        col = i * 2
        style_cmds.append(('BACKGROUND', (col,0), (col,0), bg))
        style_cmds.append(('BOX', (col,0), (col,0), 0.5, border))
    ft.setStyle(TableStyle(style_cmds))
    story.append(ft)

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════
    # 12. TECHNICAL OVERVIEW
    # ═══════════════════════════════════════════════════════
    story.append(Paragraph("12. Technical Overview", styles['H1']))
    story.append(colored_divider())

    story.append(Paragraph(
        "This section provides a high-level overview of the technology powering FocusBuddy, "
        "for stakeholders interested in the platform architecture.",
        styles['Body']
    ))

    tech_stack = [
        ["Layer", "Technology", "Purpose"],
        ["Mobile App", "React Native with Expo", "Cross-platform iOS and Android app from a single codebase"],
        ["Navigation", "Expo Router (file-based)", "Screen-to-screen navigation with deep linking support"],
        ["Styling", "NativeWind (Tailwind CSS)", "Responsive, consistent visual design across platforms"],
        ["State Management", "Zustand", "Lightweight, performant in-memory state for the app"],
        ["Backend Database", "Supabase (PostgreSQL)", "Secure, scalable cloud database with row-level security"],
        ["Authentication", "Supabase Auth", "Email/password authentication with secure token storage"],
        ["AI Engine", "OpenAI GPT-4o-mini", "Powers Drift coaching and daily task breakdowns"],
        ["Server Functions", "Supabase Edge Functions (Deno)", "Serverless functions for AI, webhooks, and data processing"],
        ["Payments", "RevenueCat", "In-app purchase and subscription management"],
        ["Local Storage", "MMKV", "High-performance device storage for timer persistence and preferences"],
        ["Error Monitoring", "Sentry", "Crash reporting and performance monitoring with privacy safeguards"],
    ]
    story.append(feature_table(tech_stack[0], tech_stack[1:], col_widths=[100, 155, 205]))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Data Model Summary:", styles['H3']))
    data_model = [
        ["Data Entity", "What It Stores", "Key Relationships"],
        ["Profiles", "User preferences, streak data, trust score", "One per user account"],
        ["Goals", "Main focus goals (title, description, active status)", "Each user has one active goal at a time"],
        ["Daily Check-Ins", "Energy level, AI conversation, task plan, completion", "One per user per day; links to goal"],
        ["Tasks", "Individual action items from check-in breakdown", "Belongs to a check-in; tracked for completion"],
        ["Focus Sessions", "Timer data: start, end, duration, rating, pauses", "Links to task and check-in"],
        ["Chat Messages", "Conversation history with Drift AI coach", "Belongs to user; stores role and content"],
        ["Promises", "Daily commitments and kept/broken status", "One per user per day"],
        ["Milestones", "Achievement records (first session, 10 hours, etc.)", "Earned once, displayed permanently"],
        ["Subscriptions", "Plan status, trial dates, entitlement level", "One active record per user"],
    ]
    story.append(feature_table(data_model[0], data_model[1:], col_widths=[95, 195, 170]))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════
    # 13. GLOSSARY
    # ═══════════════════════════════════════════════════════
    story.append(Paragraph("13. Glossary", styles['H1']))
    story.append(colored_divider())

    glossary = [
        ["Term", "Definition"],
        ["Drift", "FocusBuddy's AI coaching companion. Named to evoke gentle guidance rather than forceful direction."],
        ["Check-In", "The daily process of assessing your energy level and having the AI create a personalized task plan."],
        ["Focus Session", "A timed period of focused work on a specific task, tracked by the app's countdown timer."],
        ["Trust Score", "A 0-100 score reflecting how consistently you keep your daily promises to yourself."],
        ["Streak", "The count of consecutive days you have completed a check-in, measuring daily consistency."],
        ["Streak Shield", "A protective token (up to 3) that preserves your streak when you need a rest day."],
        ["Promise", "A small, specific daily commitment you make to yourself and track honestly."],
        ["Bad Day Toolbox", "A collection of low-effort micro-activities for days when normal productivity is not possible."],
        ["Shame Emergency", "A full-screen intervention triggered when the AI detects self-critical language in chat."],
        ["Energy Level", "Your self-assessed state at check-in: Good, Meh, Low, or Need a Break."],
        ["Session Rating", "Your post-session self-assessment: Great (Nailed It), Good (Solid), OK (Got Started), or Struggled (Showed Up Anyway)."],
        ["Milestone", "An achievement badge earned by reaching cumulative targets (first session, 10 hours, etc.)."],
        ["Celebration Style", "Your preference for how enthusiastically the AI responds to your wins: Enthusiastic, Moderate, or Minimal."],
        ["Fire and Forget", "A background operation (like updating a streak) that runs without blocking you from using the app."],
        ["Procrastination Type", "A profile setting that helps the AI understand your specific procrastination patterns and tailor its coaching."],
    ]
    story.append(feature_table(glossary[0], glossary[1:], col_widths=[110, 350]))

    story.append(Spacer(1, 20))
    story.append(thin_divider())
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "End of Document",
        ParagraphStyle('end', parent=styles['Body'], alignment=TA_CENTER, textColor=GRAY, fontSize=10)
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "FocusBuddy (Driftless) Product Documentation v1.0 - March 2026",
        ParagraphStyle('end2', parent=styles['Body'], alignment=TA_CENTER, textColor=GRAY, fontSize=9)
    ))
    story.append(Paragraph(
        "All Rights Reserved",
        ParagraphStyle('end3', parent=styles['Body'], alignment=TA_CENTER, textColor=GRAY, fontSize=9)
    ))

    # ── BUILD ──
    doc.build(
        story,
        onFirstPage=cover_page,
        onLaterPages=header_footer,
    )
    print(f"PDF generated: {OUTPUT_PATH}")

if __name__ == "__main__":
    build_pdf()
