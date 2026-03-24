#!/usr/bin/env python3
"""Generate PRODUCTION_AUDIT_REPORT_V3.pdf"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
import os

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "PRODUCTION_AUDIT_REPORT_V3.pdf")

PRIMARY = HexColor("#1a1a2e")
ACCENT = HexColor("#e94560")
ACCENT_GREEN = HexColor("#0f9b58")
ACCENT_ORANGE = HexColor("#ff6d00")
BG_LIGHT = HexColor("#f8f9fa")
TEXT_DARK = HexColor("#1a1a2e")
TEXT_GRAY = HexColor("#6c757d")
CRITICAL_RED = HexColor("#dc3545")

def get_styles():
    s = getSampleStyleSheet()
    defs = {
        'CoverTitle': dict(parent=s['Title'], fontSize=28, leading=34, textColor=PRIMARY,
                           spaceAfter=6, alignment=TA_CENTER, fontName='Helvetica-Bold'),
        'CoverSub': dict(parent=s['Normal'], fontSize=14, leading=18, textColor=ACCENT,
                         spaceAfter=20, alignment=TA_CENTER, fontName='Helvetica-Bold'),
        'CoverMeta': dict(parent=s['Normal'], fontSize=10, leading=14, textColor=TEXT_GRAY,
                          alignment=TA_CENTER),
        'Section': dict(parent=s['Heading1'], fontSize=18, leading=22, textColor=PRIMARY,
                        spaceBefore=20, spaceAfter=10, fontName='Helvetica-Bold'),
        'SubHead': dict(parent=s['Heading2'], fontSize=13, leading=17, textColor=PRIMARY,
                        spaceBefore=12, spaceAfter=6, fontName='Helvetica-Bold'),
        'Body': dict(parent=s['Normal'], fontSize=9, leading=13, textColor=TEXT_DARK, spaceAfter=4),
        'Bold': dict(parent=s['Normal'], fontSize=9, leading=13, textColor=TEXT_DARK,
                     fontName='Helvetica-Bold', spaceAfter=4),
        'TC': dict(parent=s['Normal'], fontSize=8, leading=11, textColor=TEXT_DARK),
        'TH': dict(parent=s['Normal'], fontSize=8, leading=11, textColor=white,
                    fontName='Helvetica-Bold'),
        'BulletPt': dict(parent=s['Normal'], fontSize=9, leading=13, textColor=TEXT_DARK,
                        leftIndent=20, bulletIndent=8, spaceAfter=2),
        'Score': dict(parent=s['Normal'], fontSize=48, leading=52, textColor=ACCENT_GREEN,
                      alignment=TA_CENTER, fontName='Helvetica-Bold'),
        'Verdict': dict(parent=s['Normal'], fontSize=16, leading=20, textColor=ACCENT_ORANGE,
                        alignment=TA_CENTER, fontName='Helvetica-Bold', spaceAfter=12),
    }
    for name, kw in defs.items():
        s.add(ParagraphStyle(name, **kw))
    return s

def tbl(headers, rows, widths, s):
    hdr = [Paragraph(h, s['TH']) for h in headers]
    data = [hdr] + [[Paragraph(str(c), s['TC']) for c in r] for r in rows]
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#dee2e6")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, BG_LIGHT]),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    return t

def build():
    s = get_styles()
    doc = SimpleDocTemplate(OUTPUT_PATH, pagesize=letter,
                            leftMargin=0.7*inch, rightMargin=0.7*inch,
                            topMargin=0.6*inch, bottomMargin=0.6*inch)
    story = []
    W = doc.width

    # COVER
    story.append(Spacer(1, 1.2*inch))
    story.append(Paragraph("FOCUSBUDDY", s['CoverTitle']))
    story.append(Paragraph("PRODUCTION AUDIT REPORT V3", s['CoverSub']))
    story.append(Spacer(1, 0.3*inch))
    story.append(HRFlowable(width="60%", thickness=2, color=ACCENT))
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("Post-Infrastructure Re-Audit", s['CoverMeta']))
    story.append(Paragraph("Date: 2026-03-15", s['CoverMeta']))
    story.append(Spacer(1, 0.6*inch))

    # Score progression
    sc = [[Paragraph("V1", s['CoverMeta']), Paragraph("V2", s['CoverMeta']),
            Paragraph("", s['CoverMeta']), Paragraph("V3", s['CoverMeta'])],
          [Paragraph("<font size='28' color='#dc3545'><b>24</b></font>", s['CoverMeta']),
           Paragraph("<font size='28' color='#ff6d00'><b>38</b></font>", s['CoverMeta']),
           Paragraph("<font size='20' color='#e94560'>&#8594;</font>", s['CoverMeta']),
           Paragraph("<font size='36' color='#0f9b58'><b>62</b></font>", s['CoverMeta'])]]
    sct = Table(sc, colWidths=[1.2*inch, 1.2*inch, 0.6*inch, 1.5*inch])
    sct.setStyle(TableStyle([('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    story.append(sct)
    story.append(Spacer(1, 0.4*inch))
    story.append(Paragraph("SIGNIFICANT PROGRESS — NOT YET PRODUCTION READY", s['Verdict']))
    story.append(PageBreak())

    # EXECUTIVE SUMMARY
    story.append(Paragraph("EXECUTIVE SUMMARY", s['Section']))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT))
    story.append(Spacer(1, 8))

    fix_rows = [
        ["Test Coverage", "0 tests, 0% coverage", "190 tests, 14 suites, 81% service coverage"],
        ["ESLint", "Not installed, stub script", "ESLint 9 configured, 0 errors, 49 warnings"],
        ["CI/CD", "Facade (stub lint, empty test)", "Real 5-job pipeline: typecheck+lint+test+security+build"],
        ["Error Monitoring", "None", "Sentry with user context, breadcrumbs, header scrubbing"],
        ["Rate Limiting", "TOCTOU race condition", "Atomic PG function with FOR UPDATE row locking"],
        ["CORS", "Wildcard * on all endpoints", "Environment-based ALLOWED_ORIGIN on all functions"],
    ]
    story.append(tbl(["Fix", "Before", "After"], fix_rows, [1.2*inch, 2*inch, W-3.2*inch], s))
    story.append(Spacer(1, 12))
    story.append(Paragraph("Score improved from 38 to 62. The app has moved from 'proof-of-concept' to "
                           "'early-stage product with known gaps.'", s['Body']))
    story.append(PageBreak())

    # TEST COVERAGE DETAILS
    story.append(Paragraph("TEST SUITE — 190 TESTS, 14 SUITES", s['Section']))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT_GREEN))
    story.append(Spacer(1, 8))

    test_rows = [
        ["utils/time.ts", "32", "100%", "100%"],
        ["utils/constants.ts", "18", "100%", "100%"],
        ["services/auth", "14", "96%", "100%"],
        ["services/shields", "13", "100%", "100%"],
        ["services/checkin", "8", "100%", "100%"],
        ["services/goals", "8", "91%", "100%"],
        ["services/sessions", "13", "93%", "100%"],
        ["services/promises", "13", "93%", "100%"],
        ["services/profile", "12", "95%", "100%"],
        ["services/chat", "13", "96%", "100%"],
        ["stores/authStore", "16", "69%", "73%"],
        ["stores/sessionStore", "14", "76%", "79%"],
        ["hooks/useAppState", "7", "100%", "100%"],
        ["lib/sentry", "9", "mock-based", "validation"],
    ]
    story.append(tbl(["Suite", "Tests", "Statements", "Lines"], test_rows,
                      [1.8*inch, 0.6*inch, 0.9*inch, W-3.3*inch], s))
    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>Aggregate service coverage: 81.5% statements, 85.6% lines.</b> "
                           "All critical paths tested: auth, shields (CAS), check-in, sessions, "
                           "promises/trust score, chat rate limiting.", s['Bold']))
    story.append(PageBreak())

    # INFRASTRUCTURE
    story.append(Paragraph("INFRASTRUCTURE IMPROVEMENTS", s['Section']))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT_GREEN))
    story.append(Spacer(1, 8))

    story.append(Paragraph("ESLint Configuration", s['SubHead']))
    for pt in [
        "ESLint 9 with flat config (eslint.config.mjs)",
        "Plugins: @typescript-eslint, react, react-hooks, react-native",
        "Results: <b>0 errors, 49 warnings</b> (all no-explicit-any or no-unused-vars)",
        "CI enforces max 50 warnings — above this, builds fail",
    ]:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {pt}", s['BulletPt']))

    story.append(Spacer(1, 8))
    story.append(Paragraph("CI/CD Pipeline (5 Jobs)", s['SubHead']))
    ci_rows = [
        ["1. typecheck", "tsc --noEmit", "Catches type errors"],
        ["2. lint", "eslint . --max-warnings 50", "Enforces code quality"],
        ["3. test", "jest --coverage --ci", "Runs 190 tests + 'no tests found' guard"],
        ["4. security", "npm audit + secret scan", "Catches vulnerabilities + leaked keys"],
        ["5. build-check", "expo export --platform web", "Verifies app builds (depends on 1-3)"],
    ]
    story.append(tbl(["Job", "Command", "Purpose"], ci_rows, [1.2*inch, 2*inch, W-3.2*inch], s))

    story.append(Spacer(1, 8))
    story.append(Paragraph("Sentry Error Monitoring", s['SubHead']))
    for pt in [
        "@sentry/react-native installed and configured",
        "Wrapper: initSentry(), captureError(), setSentryUser(), addBreadcrumb()",
        "Initialized at module level in _layout.tsx (before any component renders)",
        "User context set on auth state changes for error attribution",
        "Authorization/Cookie headers scrubbed from error events",
        "Graceful no-op when DSN not set (safe for development)",
    ]:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {pt}", s['BulletPt']))
    story.append(PageBreak())

    # SECURITY FIXES
    story.append(Paragraph("SECURITY FIXES", s['Section']))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT_GREEN))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Atomic Rate Limiting", s['SubHead']))
    for pt in [
        "New PostgreSQL function <b>increment_rate_limit()</b> in 002_rate_limit_function.sql",
        "Uses <b>SELECT ... FOR UPDATE</b> row locking — true atomic check-and-increment",
        "Handles window expiration, row creation, and limit enforcement in single transaction",
        "Returns -1 when rate limited, positive count on success",
        "ai-chat/index.ts calls .rpc('increment_rate_limit') instead of old CAS pattern",
        "<b>No more TOCTOU race condition</b> — impossible to bypass under concurrent load",
    ]:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {pt}", s['BulletPt']))

    story.append(Spacer(1, 8))
    story.append(Paragraph("CORS Restriction", s['SubHead']))
    for pt in [
        "All 4 edge functions use <b>Deno.env.get('ALLOWED_ORIGIN')</b> with fallback",
        "No more Access-Control-Allow-Origin: '*' anywhere in codebase",
        "revenuecat-webhook: no CORS headers on non-OPTIONS responses (server-to-server)",
        "Verified: grep confirms only allowedOrigin references remain",
    ]:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {pt}", s['BulletPt']))
    story.append(PageBreak())

    # REMAINING ISSUES
    story.append(Paragraph("REMAINING ISSUES", s['Section']))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT_ORANGE))
    story.append(Spacer(1, 8))

    story.append(Paragraph("CRITICAL (3 remaining)", s['SubHead']))
    c_rows = [
        ["C1", "trial-confirmation.tsx", "Client-side subscription INSERT", "0.5 day"],
        ["C2", "paywall.tsx", "Purchase flow stubbed ('Coming Soon')", "2-3 days"],
        ["C3", "subscriptionStore.ts", "RevenueCat never calls configure()", "1 day"],
    ]
    story.append(tbl(["ID", "File", "Issue", "Effort"], c_rows, [0.4*inch, 1.5*inch, W-2.8*inch, 0.9*inch], s))

    story.append(Spacer(1, 8))
    story.append(Paragraph("HIGH (7 remaining)", s['SubHead']))
    h_rows = [
        ["H1", "ai-chat, ai-checkin", "Prompt injection — user data unescaped in system prompts"],
        ["H2", "ai-chat, ai-checkin", "Timezone bug — UTC dates instead of user timezone"],
        ["H3", "ai-checkin", "Silent task insert failure — 200 OK but tasks not saved"],
        ["H4", "revenuecat-webhook", "JSON.parse no try/catch — crashes on bad payload"],
        ["H5", "revenuecat-webhook", "appUserId may not be valid UUID"],
        ["H6", "check-in.tsx:160", "UUID uses Math.random() — collisions possible"],
        ["H7", "database.ts", "deleted_at field missing from types"],
    ]
    story.append(tbl(["ID", "File", "Issue"], h_rows, [0.4*inch, 1.4*inch, W-1.8*inch], s))

    story.append(Spacer(1, 8))
    story.append(Paragraph("MEDIUM (10) + LOW (6) — see full markdown report for details", s['Body']))
    story.append(PageBreak())

    # SCORING
    story.append(Paragraph("PRODUCTION READINESS SCORE", s['Section']))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT))
    story.append(Spacer(1, 12))
    story.append(Paragraph("62/100", s['Score']))
    story.append(Paragraph("SIGNIFICANT PROGRESS — APPROACHING PRODUCTION", s['Verdict']))
    story.append(Spacer(1, 12))

    score_rows = [
        ["Security", "25%", "20", "35", "60", "15.00"],
        ["Correctness", "20%", "30", "55", "60", "12.00"],
        ["Test Coverage", "15%", "0", "0", "65", "9.75"],
        ["Infrastructure", "15%", "5", "15", "70", "10.50"],
        ["Performance", "10%", "45", "45", "50", "5.00"],
        ["Code Quality", "10%", "50", "60", "72", "7.20"],
        ["UX Completeness", "5%", "35", "55", "55", "2.75"],
        ["TOTAL", "100%", "24", "38", "62", "62.20"],
    ]
    story.append(tbl(["Category", "Weight", "V1", "V2", "V3", "Weighted"],
                      score_rows, [1.2*inch, 0.6*inch, 0.5*inch, 0.5*inch, 0.5*inch, W-3.3*inch], s))
    story.append(PageBreak())

    # ROADMAP
    story.append(Paragraph("ROADMAP TO 90+", s['Section']))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT_GREEN))
    story.append(Spacer(1, 8))

    road_rows = [
        ["1", "Implement RevenueCat purchase flow", "2-3 days", "+10"],
        ["2", "Move subscription creation server-side", "0.5 day", "+4"],
        ["3", "Add component tests (10-15 files)", "2 days", "+5"],
        ["4", "Escape user data in AI prompts", "0.5 day", "+3"],
        ["5", "Fix timezone handling", "0.5 day", "+2"],
        ["6", "Add React error boundaries", "0.5 day", "+2"],
        ["7", "Fix remaining HIGH bugs", "1 day", "+4"],
        ["8", "Add Prettier + husky pre-commit", "0.5 day", "+1"],
        ["9", "Fix EAS projectId + build config", "1 hour", "+1"],
    ]
    story.append(tbl(["#", "Requirement", "Effort", "Impact"],
                      road_rows, [0.3*inch, 2.8*inch, 0.9*inch, W-4*inch], s))
    story.append(Spacer(1, 12))
    story.append(Paragraph("<b>Total: ~7-9 days to reach 90+. Primary blocker: payment stack (RevenueCat).</b>", s['Bold']))
    story.append(PageBreak())

    # FINAL
    story.append(Spacer(1, 0.8*inch))
    story.append(Paragraph("FINAL ASSESSMENT", s['Section']))
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT))
    story.append(Spacer(1, 16))

    story.append(Paragraph(
        "The six infrastructure fixes transformed FocusBuddy from a proof-of-concept to an early-stage product. "
        "The app now has real safety nets: <b>190 tests catch regressions</b>, <b>ESLint enforces quality</b>, "
        "<b>CI blocks broken merges</b>, <b>Sentry catches production errors</b>, "
        "<b>rate limiting is truly atomic</b>, and <b>CORS is restrictive</b>.", s['Body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "The remaining gap to 90+ is primarily the <b>payment stack</b> "
        "(RevenueCat initialization, purchase flow, server-side subscription management) "
        "and secondary hardening (prompt escaping, timezone fixes, error boundaries).", s['Body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "The architecture, code quality, and infrastructure are now approaching production standards. "
        "With 7-9 more days of focused engineering, this app can reach 90+.", s['Body']))
    story.append(Spacer(1, 16))
    story.append(Paragraph("<b>Score trajectory: 24 &#8594; 38 &#8594; 62. Projected: 90+ with ~7-9 days work.</b>", s['Bold']))
    story.append(Spacer(1, 24))
    story.append(HRFlowable(width="40%", thickness=1, color=TEXT_GRAY))
    story.append(Spacer(1, 8))
    story.append(Paragraph("End of Audit Report V3", s['CoverMeta']))

    doc.build(story)
    print(f"PDF generated: {OUTPUT_PATH}")

if __name__ == "__main__":
    build()
