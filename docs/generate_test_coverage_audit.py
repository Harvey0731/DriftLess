#!/usr/bin/env python3
"""Generate Comprehensive Test Coverage Audit Report PDF."""

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import os
from datetime import datetime

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "Test_Coverage_Audit_Report.pdf")


def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=letter,
        leftMargin=0.6 * inch,
        rightMargin=0.6 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
    )

    styles = getSampleStyleSheet()
    # Custom styles
    styles.add(ParagraphStyle(name='TitleMain', parent=styles['Title'], fontSize=20, spaceAfter=4, textColor=colors.HexColor('#1a1a2e')))
    styles.add(ParagraphStyle(name='Subtitle', parent=styles['Normal'], fontSize=10, textColor=colors.grey, spaceAfter=16))
    styles.add(ParagraphStyle(name='SectionHead', parent=styles['Heading1'], fontSize=15, textColor=colors.HexColor('#1a1a2e'), spaceBefore=14, spaceAfter=6))
    styles.add(ParagraphStyle(name='SubSection', parent=styles['Heading2'], fontSize=12, textColor=colors.HexColor('#333366'), spaceBefore=10, spaceAfter=4))
    styles.add(ParagraphStyle(name='SubSection3', parent=styles['Heading3'], fontSize=10, textColor=colors.HexColor('#444488'), spaceBefore=6, spaceAfter=3))
    styles.add(ParagraphStyle(name='Body', parent=styles['Normal'], fontSize=9, leading=13, spaceAfter=5))
    styles.add(ParagraphStyle(name='BodyBold', parent=styles['Normal'], fontSize=9, leading=13, spaceAfter=5, fontName='Helvetica-Bold'))
    styles.byName['Bullet'] = ParagraphStyle(name='Bullet', parent=styles['Normal'], fontSize=9, leading=13, leftIndent=18, bulletIndent=8, spaceAfter=2)
    styles.add(ParagraphStyle(name='VerdictGreen', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#0a7e0a'), spaceAfter=4, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='VerdictOrange', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#cc6600'), spaceAfter=4, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='VerdictRed', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#cc0000'), spaceAfter=4, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='SmallNote', parent=styles['Normal'], fontSize=7, textColor=colors.grey, spaceAfter=2))
    styles.add(ParagraphStyle(name='C', parent=styles['Normal'], fontSize=8, leading=11))
    styles.add(ParagraphStyle(name='CB', parent=styles['Normal'], fontSize=8, leading=11, fontName='Helvetica-Bold'))

    story = []
    HR = lambda: HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0'))
    HR2 = lambda: HRFlowable(width="100%", thickness=2, color=colors.HexColor('#8B5CF6'))
    SP = lambda h=0.1: Spacer(1, h * inch)

    def make_table(data, widths, header_color='#2d2d5e'):
        t = Table(data, colWidths=widths, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(header_color)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#cccccc')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f8fc')]),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        return t

    # ═══════════════════════════════════════════════════════════════════════
    # TITLE PAGE
    # ═══════════════════════════════════════════════════════════════════════
    story.append(SP(1.5))
    story.append(Paragraph("Comprehensive Test Coverage", styles['TitleMain']))
    story.append(Paragraph("Audit Report", styles['TitleMain']))
    story.append(SP(0.2))
    story.append(HR2())
    story.append(SP(0.2))
    story.append(Paragraph(f"Driftless (FocusBuddy) | {datetime.now().strftime('%B %d, %Y')}", styles['Subtitle']))
    story.append(Paragraph("Principal QA Auditor | Static Analysis Only | No Tests Executed", styles['Subtitle']))
    story.append(SP(0.5))

    # TOC
    story.append(Paragraph("Table of Contents", styles['SubSection']))
    toc = [
        "1. Executive Summary",
        "2. Feature Coverage Table (All 55 Features)",
        "3. Untested / Weakly Tested Features (Detailed)",
        "4. High Priority Breakpoints (Top 10 Risks)",
        "5. What Was Checked (Audit Trail)",
        "6. Final Verdict",
    ]
    for item in toc:
        story.append(Paragraph(item, styles['Bullet']))
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # 1. EXECUTIVE SUMMARY
    # ═══════════════════════════════════════════════════════════════════════
    story.append(Paragraph("1. Executive Summary", styles['SectionHead']))
    story.append(HR())
    story.append(SP())

    summary_data = [
        [Paragraph("<b>Metric</b>", styles['CB']), Paragraph("<b>Value</b>", styles['CB'])],
        [Paragraph("Total features identified", styles['C']), Paragraph("55 distinct functional components", styles['C'])],
        [Paragraph("Test suites", styles['C']), Paragraph("24 suites, 381 tests, all passing", styles['C'])],
        [Paragraph("Files with unit tests", styles['C']), Paragraph("21 of 55 (~38%)", styles['C'])],
        [Paragraph("Statement coverage (src/)", styles['C']), Paragraph("71.95% (662/920)", styles['C'])],
        [Paragraph("Branch coverage (src/)", styles['C']), Paragraph("56.67% (331/584)", styles['C'])],
        [Paragraph("Edge Functions tested", styles['C']), Paragraph("0 of 6 (0%)", styles['C'])],
        [Paragraph("Screen/component tests", styles['C']), Paragraph("3 of 28 components (10.7%)", styles['C'])],
        [Paragraph("E2E / integration tests", styles['C']), Paragraph("0", styles['C'])],
        [Paragraph("Overall system risk", styles['C']), Paragraph("MEDIUM-HIGH", styles['CB'])],
    ]
    story.append(make_table(summary_data, [2.8 * inch, 4.2 * inch]))
    story.append(SP(0.15))

    story.append(Paragraph(
        "<b>Brutal Truth:</b> The service and store layers are competently tested (93% and 87% respectively), "
        "but the entire server-side business logic layer (6 Edge Functions, 1,525 lines total) has ZERO tests. "
        "All 15 app screens (4,350+ lines of UI/business logic) have ZERO component tests. "
        "The system is \"tested at the edges but hollow in the middle\" \u2014 the most dangerous kind of test suite "
        "because it creates false confidence. A passing CI pipeline hides the fact that the code handling money, "
        "AI responses, authentication guards, and session recovery has never been verified.",
        styles['Body']
    ))
    story.append(SP())

    layer_data = [
        [Paragraph("<b>Layer</b>", styles['CB']), Paragraph("<b>Files</b>", styles['CB']),
         Paragraph("<b>Tests</b>", styles['CB']), Paragraph("<b>Coverage</b>", styles['CB']),
         Paragraph("<b>Risk</b>", styles['CB'])],
        [Paragraph("Zustand Stores (5)", styles['C']), Paragraph("5 of 5", styles['C']),
         Paragraph("72 tests", styles['C']), Paragraph("86.79%", styles['C']),
         Paragraph("LOW", styles['C'])],
        [Paragraph("Services (11)", styles['C']), Paragraph("10 of 11", styles['C']),
         Paragraph("~170 tests", styles['C']), Paragraph("93.38%", styles['C']),
         Paragraph("LOW", styles['C'])],
        [Paragraph("Libs/Utils (5)", styles['C']), Paragraph("2 of 5", styles['C']),
         Paragraph("~30 tests", styles['C']), Paragraph("~50%", styles['C']),
         Paragraph("MEDIUM", styles['C'])],
        [Paragraph("Utils (2)", styles['C']), Paragraph("2 of 2", styles['C']),
         Paragraph("~60 tests", styles['C']), Paragraph("~99%", styles['C']),
         Paragraph("LOW", styles['C'])],
        [Paragraph("Components (17)", styles['C']), Paragraph("3 of 17", styles['C']),
         Paragraph("~12 tests", styles['C']), Paragraph("<10%", styles['C']),
         Paragraph("MEDIUM", styles['C'])],
        [Paragraph("Hooks (1)", styles['C']), Paragraph("1 of 1", styles['C']),
         Paragraph("3 tests", styles['C']), Paragraph("100%", styles['C']),
         Paragraph("LOW", styles['C'])],
        [Paragraph("Screens (15)", styles['C']), Paragraph("0 of 15", styles['C']),
         Paragraph("0 tests", styles['C']), Paragraph("0%", styles['C']),
         Paragraph("HIGH", styles['C'])],
        [Paragraph("Edge Functions (6)", styles['C']), Paragraph("0 of 6", styles['C']),
         Paragraph("0 tests", styles['C']), Paragraph("0%", styles['C']),
         Paragraph("CRITICAL", styles['C'])],
        [Paragraph("E2E/Integration", styles['C']), Paragraph("N/A", styles['C']),
         Paragraph("0 tests", styles['C']), Paragraph("0%", styles['C']),
         Paragraph("HIGH", styles['C'])],
    ]
    story.append(make_table(layer_data, [1.5 * inch, 0.9 * inch, 0.9 * inch, 0.9 * inch, 0.9 * inch]))
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # 2. FEATURE COVERAGE TABLE
    # ═══════════════════════════════════════════════════════════════════════
    story.append(Paragraph("2. Feature Coverage Table", styles['SectionHead']))
    story.append(HR())
    story.append(SP())

    def feature_row(name, location, tested, types, what_tested, what_not, risk):
        return [
            Paragraph(name, styles['C']),
            Paragraph(location, styles['C']),
            Paragraph(tested, styles['CB']),
            Paragraph(types, styles['C']),
            Paragraph(what_tested, styles['C']),
            Paragraph(what_not, styles['C']),
            Paragraph(risk, styles['CB']),
        ]

    hdr = [
        Paragraph("<b>Feature</b>", styles['CB']),
        Paragraph("<b>Location</b>", styles['CB']),
        Paragraph("<b>Tested?</b>", styles['CB']),
        Paragraph("<b>Types</b>", styles['CB']),
        Paragraph("<b>What Tested</b>", styles['CB']),
        Paragraph("<b>Not Tested</b>", styles['CB']),
        Paragraph("<b>Risk</b>", styles['CB']),
    ]
    widths = [1.1 * inch, 0.9 * inch, 0.5 * inch, 0.5 * inch, 1.4 * inch, 1.6 * inch, 0.5 * inch]

    # STORES
    story.append(Paragraph("Stores (State Management)", styles['SubSection']))
    store_rows = [hdr,
        feature_row("Auth Store", "stores/authStore", "Partial", "Unit", "signIn, signOut, resetPassword, fetchProfile, updateProfile (17 tests)", "signUp entirely, initialize callback, fetchProfile error, isAuthenticated derivation", "Med"),
        feature_row("Chat Store", "stores/chatStore", "Yes", "Unit", "fetch, send, delete, clear, rateLimit (32 tests, 100% stmt)", "Timeout behavior in context, concurrent sends", "Low"),
        feature_row("Goal Store", "stores/goalStore", "Partial", "Unit", "fetch, create, archive, toggleTask (21 tests)", "Unauthenticated paths (5), fetchTodayCheckIn/Tasks error", "Low"),
        feature_row("Session Store", "stores/sessionStore", "Partial", "Unit", "start, pause, resume, end, updateElapsed (16 tests)", "restoreTimerFromMMKV (9 branches, 0 tests), startSession DB error, MAX_SESSION cap", "High"),
        feature_row("Subscription Store", "stores/subscriptionStore", "Yes", "Unit", "init, entitlement, offerings, purchase, restore (20 tests)", "Happy init path (mock limitation)", "Low"),
    ]
    story.append(make_table(store_rows, widths))
    story.append(SP())

    # SERVICES
    story.append(Paragraph("Services (Data Layer)", styles['SubSection']))
    svc_rows = [hdr,
        feature_row("Auth Service", "services/auth", "Yes", "Unit", "signUp+profile, signIn, signOut, reset, getSession (10 tests)", "onAuthStateChange listener", "Low"),
        feature_row("Chat Service", "services/chat", "Yes", "Unit", "send, getMessages, delete, clear (7 tests)", "None significant", "Low"),
        feature_row("Check-in Service", "services/checkin", "Yes", "Unit", "getTodayCheckIn, startCheckIn+streak, getRecent (6 tests)", "90-day cap enforcement", "Low"),
        feature_row("Goals Service", "services/goals", "Yes", "Unit", "getActive, create+deactivate, archive, getGoals (8 tests)", "Archived filter", "Low"),
        feature_row("Profile Service", "services/profile", "Yes", "Unit", "get, update whitelist, completeOnboarding CAS, delete (10 tests)", "signOut error in delete, undefined procrastinationType", "Low"),
        feature_row("Promises Service", "services/promises", "Partial", "Unit", "CRUD, trustScore formula (13 tests)", "updatePromise broken_reason, history cap, score clamp boundary, captureError path", "Med"),
        feature_row("Sessions Service", "services/sessions", "Yes", "Unit", "create, update whitelist, end, recent, stats (10 tests)", "Stats with 0 sessions", "Low"),
        feature_row("Shields Service", "services/shields", "Yes", "Unit", "award CAS, use CAS, getCount (10 tests)", "null vs empty-array edge", "Low"),
        feature_row("Subscription Svc", "services/subscription", "Yes", "Unit", "get, update safe fields, trialStatus (11 tests)", "Explicit whitelist proof", "Low"),
        feature_row("Tasks Service", "services/tasks", "Yes", "Unit", "getForCheckIn, getToday, toggle, create (11 tests)", "None significant", "Low"),
    ]
    story.append(make_table(svc_rows, widths))
    story.append(SP())

    # EDGE FUNCTIONS
    story.append(Paragraph("Edge Functions (Server-side, Deno Runtime)", styles['SubSection']))
    ef_rows = [hdr,
        feature_row("ai-chat", "supabase/fn/ai-chat", "No", "None", "Nothing", "ALL: auth, rate limit, sanitize, shame detect, OpenAI call, timeout, DB persist (339 lines, ~20 branches)", "CRIT"),
        feature_row("ai-checkin", "supabase/fn/ai-checkin", "No", "None", "Nothing", "ALL: auth, rate limit, input validation, OpenAI call, response parsing, check-in upsert, task insert (444 lines, ~32 branches)", "CRIT"),
        feature_row("activate-trial", "supabase/fn/activate-trial", "No", "None", "Nothing", "ALL: auth, rate limit, CAS guard, already-subscribed, insert fallback (154 lines, ~12 branches)", "High"),
        feature_row("revenuecat-webhook", "supabase/fn/revenuecat-webhook", "No", "None", "Nothing", "ALL: HMAC verify, 5 event types, idempotency, UUID validation, upsert (279 lines, ~18 branches)", "CRIT"),
        feature_row("delete-account", "supabase/fn/delete-account", "No", "None", "Nothing", "ALL: auth, rate limit, soft-delete, sign-out (118 lines, ~8 branches)", "High"),
        feature_row("data-export", "supabase/fn/data-export", "No", "None", "Nothing", "ALL: auth, rate limit, 9-table fetch, row cap, JSON response (191 lines, ~12 branches)", "Med"),
    ]
    story.append(make_table(ef_rows, widths))
    story.append(SP())

    # SCREENS
    story.append(Paragraph("Screens (UI + Business Logic)", styles['SubSection']))
    scr_rows = [hdr,
        feature_row("Root Layout", "app/_layout", "No", "None", "Nothing", "Route protection, 30-day auto-logout, auth state change, PASSWORD_RECOVERY deep link, theme (269 lines, ~18 branches)", "High"),
        feature_row("Home Screen", "app/(tabs)/index", "No", "None", "Nothing", "Task toggle, data fetching, goal display, refresh (346 lines)", "Med"),
        feature_row("Progress Screen", "app/(tabs)/progress", "No", "None", "Nothing", "Period selector, stats calculation, session history, FlatList (812 lines)", "Low"),
        feature_row("Chat Screen", "app/(tabs)/chat", "No", "None", "Nothing", "Optimistic UI, rate limit display, load-more, prefill, shame redirect (348 lines)", "Med"),
        feature_row("Settings Screen", "app/(tabs)/settings", "No", "None", "Nothing", "Toggle switches, sign-out, navigation (439 lines)", "Low"),
        feature_row("Check-In Screen", "app/check-in", "No", "None", "Nothing", "Energy select, AI task gen, clarification loop, task editing, shield usage (857 lines, ~38 branches)", "High"),
        feature_row("Timer Screen", "app/timer", "No", "None", "Nothing", "Session setup, cold-start restore, tick interval, goal-reached (374 lines, ~20 branches)", "High"),
        feature_row("Session Rating", "app/session-rating", "No", "None", "Nothing", "Rating save, app-quit fallback, streak update, task complete (294 lines, ~18 branches)", "High"),
        feature_row("Promises Screen", "app/promises", "No", "None", "Nothing", "Promise CRUD, trust score display, history (423 lines)", "Med"),
        feature_row("Paywall Screen", "app/paywall", "No", "None", "Nothing", "Package display, purchase flow, restore flow (175 lines, ~14 branches)", "High"),
        feature_row("Shame Emergency", "app/shame-emergency", "No", "None", "Nothing", "Evidence fetch, micro-actions, grounding flow (420 lines)", "Low"),
        feature_row("Edit Profile", "app/edit-profile", "No", "None", "Nothing", "Profile form, goal display (286 lines)", "Low"),
        feature_row("Bad Day Toolbox", "app/bad-day-toolbox", "No", "None", "Nothing", "Category display, action selection (225 lines)", "Low"),
        feature_row("Data Export", "app/data-export", "No", "None", "Nothing", "Export trigger, share flow (170 lines)", "Low"),
        feature_row("Delete Account", "app/delete-account", "No", "None", "Nothing", "Confirmation, soft-delete, sign-out (133 lines)", "Med"),
    ]
    story.append(make_table(scr_rows, widths))
    story.append(SP())

    # COMPONENTS
    story.append(Paragraph("Components", styles['SubSection']))
    comp_rows = [hdr,
        feature_row("Button", "components/ui/Button", "Yes", "Unit", "Variants, press, loading, disabled (6 tests)", "None", "Low"),
        feature_row("Card", "components/ui/Card", "Yes", "Unit", "Children, press, shadow (5 tests)", "None", "Low"),
        feature_row("ErrorBoundary", "components/ErrorBoundary", "Yes", "Unit", "Catch, fallback, Sentry, retry (4 tests)", "None", "Low"),
        feature_row("MessageBubble", "components/chat/MessageBubble", "No", "None", "Nothing", "Render, long-press, timestamp format, memo", "Low"),
        feature_row("14 other components", "components/*", "No", "None", "Nothing", "All rendering, interaction, state display", "Low"),
    ]
    story.append(make_table(comp_rows, widths))
    story.append(SP())

    # LIBS + INFRA
    story.append(Paragraph("Infrastructure", styles['SubSection']))
    infra_rows = [hdr,
        feature_row("MMKV storage", "lib/mmkv", "Yes", "Unit", "Timer state R/W, activity tracking, parse error (8 tests)", "None significant", "Low"),
        feature_row("Sentry", "lib/sentry", "Partial", "Unit", "init, captureError, setUser, breadcrumb (5 tests)", "setSentryEnabled, beforeSend scrub", "Low"),
        feature_row("Timeout utility", "lib/timeout", "No", "None", "Nothing", "withTimeout race, TimeoutError, timer cleanup", "Med"),
        feature_row("fireAndForget", "lib/fireAndForget", "No", "None", "Nothing", "Promise rejection capture to Sentry", "Low"),
        feature_row("Supabase client", "lib/supabase", "No", "None", "Nothing", "Client init, secure-store adapter, env validation", "Low"),
        feature_row("useAppState hook", "hooks/useAppState", "Yes", "Unit", "Foreground, background, cleanup (3 tests)", "None", "Low"),
        feature_row("Time utils", "utils/time", "Yes", "Unit", "All formatters and helpers (~45 tests)", "None", "Low"),
        feature_row("Constants", "utils/constants", "Yes", "Unit", "All values/structure validated (~15 tests)", "None", "Low"),
        feature_row("CI/CD Pipeline", ".github/workflows/ci.yml", "N/A", "N/A", "5 jobs: tsc, lint, test, security, build", "No coverage threshold enforcement", "Med"),
        feature_row("DB Migrations", "supabase/migrations/", "No", "None", "Nothing", "RLS policies, atomic functions, schema constraints", "High"),
    ]
    story.append(make_table(infra_rows, widths))
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # 3. UNTESTED/WEAKLY TESTED FEATURES (DETAILED)
    # ═══════════════════════════════════════════════════════════════════════
    story.append(Paragraph("3. Untested / Weakly Tested Features (Detailed)", styles['SectionHead']))
    story.append(HR())
    story.append(SP())

    gaps = [
        ("revenuecat-webhook (279 lines)", "CRITICAL", "Unit+Integration",
         "HMAC-SHA256 signature verification (constant-time comparison), all 5 event type mappings (INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE), idempotency via last_webhook_event_id, UUID validation regex, upsert vs update branching, missing REFUND/PRODUCT_CHANGE events, fail-closed on missing secret",
         "Forged webhook could grant pro access. Replay attack could corrupt subscription state. Missing REFUND handler means refunded users keep pro access."),

        ("ai-chat Edge Function (339 lines)", "CRITICAL", "Unit+Integration",
         "JWT auth enforcement, atomic server-side rate limiting (100/hr), sanitizeForPrompt (HTML/newline/unicode stripping), shame language detection (20 patterns), OpenAI call with 15s AbortController timeout, OpenAI error/502 handling, both messages persisted to DB, timezone validation",
         "Prompt injection via unsanitized input. Rate limit bypass. AI timeout leaving user in streaming state. Shame detection false negatives leaving vulnerable users unsupported."),

        ("ai-checkin Edge Function (444 lines)", "CRITICAL", "Unit+Integration",
         "Auth, rate limiting, energy level validation (1-5), message/hardReason length caps, parseAiResponse (JSON extraction from markdown fences + fallback), clarification vs task response branching, check-in upsert, task row batch insert, partial success handling",
         "Invalid AI response crashes check-in flow. Task generation with malformed JSON breaks daily routine. Uncapped input fields enable payload attacks."),

        ("sessionStore.restoreTimerFromMMKV (9 branches)", "HIGH", "Unit",
         "Timer null (no stored state), timer status 'stopped', Supabase session fetch error, session null (stale timer), session.status 'completed'/'abandoned' (already ended), valid running session restore, valid paused session restore",
         "App cold-start after crash could lose in-progress session or show ghost timer. User sees timer stuck at old values after reopen."),

        ("activate-trial Edge Function (154 lines)", "HIGH", "Unit",
         "Auth, rate limiting (5/hr), atomic CAS guard (.not('status','in',...)), already-subscribed 409 response, missing subscription row INSERT fallback, trial end date calculation",
         "Rate limit bypass enables trial farming. CAS guard regression allows duplicate active trials. INSERT fallback failure leaves user in limbo."),

        ("app/_layout.tsx Route Protection (269 lines)", "HIGH", "Unit+Component",
         "Protected route guard (5 branches), 30-day inactivity forced sign-out, PASSWORD_RECOVERY deep link handling, auth state change callback, font loading, SplashScreen lifecycle",
         "Guard regression exposes app to unauthenticated access. Inactivity check failure leaves stale sessions. Password reset deep link misrouting breaks recovery flow."),

        ("app/session-rating.tsx handleSave (294 lines)", "HIGH", "Component",
         "Rating validation guard, auth guard, endSession via store, app-quit fallback (dynamic import + direct service call), task completion fire-and-forget, streak update RPC, navigation branching (canGoBack vs replace)",
         "App-quit fallback path never verified - could lose completed sessions. Streak update failure silently leaves streak stale."),

        ("app/check-in.tsx (857 lines, 38 branches)", "HIGH", "Component",
         "Energy selection flow, need-a-break shield path, AI clarification loop, task editing/regeneration, custom time input sanitization, handleConfirm navigation, handleRestDay shield CAS",
         "Clarification loop could infinite-loop on persistent vague input. Shield CAS failure leaves user confused. Custom time bypasses 5-180 range validation."),

        ("app/timer.tsx (374 lines, 20 branches)", "HIGH", "Component",
         "Session setup from MMKV preferences, check-in vs quick-action entry, cold-start restore, tick interval with goal-reached detection, AppState foreground reconciliation, custom duration input",
         "Cold-start restore failure shows blank timer. Tick interval drift after backgrounding. Goal-reached not firing at exact boundary."),

        ("app/paywall.tsx Purchase Flow (175 lines)", "HIGH", "Component",
         "Package fetching and display, purchasePackage success/cancel/error, restorePurchases success/no-purchases/error, loading states",
         "Purchase succeeds but UI doesn't navigate back (user charged but confused). Restore shows false 'no purchases' on transient error."),

        ("authStore.signUp (never tested)", "MEDIUM", "Unit",
         "Happy path (creates user), error path (sets isLoading false), integration with profile creation",
         "Registration bug silently blocks new users. isLoading stuck true on error shows permanent spinner."),

        ("delete-account Edge Function (118 lines)", "MEDIUM", "Unit",
         "Auth, rate limiting (3/hr), soft-delete profile, sign-out after deletion, error paths",
         "Rate limit bypass enables deletion harassment. Soft-delete failure leaves account in inconsistent state."),

        ("Database Migrations / RLS Policies", "HIGH", "Integration",
         "All RLS policies on 8 tables (profiles, goals, daily_check_ins, tasks, focus_sessions, chat_messages, promises, subscriptions), atomic functions (swap_active_goal, check_rate_limit, update_streak), index effectiveness",
         "Misconfigured RLS exposes user data cross-tenant. Atomic function regression causes race conditions in goal swap or rate limiting."),

        ("Timeout utility (lib/timeout.ts)", "MEDIUM", "Unit",
         "withTimeout race behavior, TimeoutError construction, timer cleanup on resolve/reject",
         "Timer leak if promise resolves after timeout. TimeoutError not properly caught by callers."),

        ("promises.service broken_reason branch", "LOW", "Unit",
         "updatePromise with reason string provided (broken_reason field), history 90-day cap Math.min, score clamp boundary at 0 and 100",
         "Broken reason silently dropped. History returns unbounded data on large days param."),
    ]

    gap_data = [
        [Paragraph("<b>Feature</b>", styles['CB']), Paragraph("<b>Priority</b>", styles['CB']),
         Paragraph("<b>Test Type</b>", styles['CB']), Paragraph("<b>Missing Scenarios</b>", styles['CB']),
         Paragraph("<b>Failure Impact</b>", styles['CB'])],
    ]
    for name, prio, ttype, missing, impact in gaps:
        gap_data.append([
            Paragraph(name, styles['C']),
            Paragraph(prio, styles['CB']),
            Paragraph(ttype, styles['C']),
            Paragraph(missing, styles['C']),
            Paragraph(impact, styles['C']),
        ])
    story.append(make_table(gap_data, [1.3 * inch, 0.5 * inch, 0.6 * inch, 2.5 * inch, 2.1 * inch]))
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # 4. HIGH PRIORITY BREAKPOINTS
    # ═══════════════════════════════════════════════════════════════════════
    story.append(Paragraph("4. High Priority Breakpoints (Top 10 Risks)", styles['SectionHead']))
    story.append(HR())
    story.append(SP())

    breakpoints = [
        ("1. RevenueCat webhook accepts forged events",
         "The HMAC-SHA256 signature verification has zero tests. A regression in the constant-time comparison or key import could silently pass invalid signatures, allowing anyone to POST fake INITIAL_PURCHASE events and grant themselves pro access.",
         "Revenue loss, unauthorized pro access to all users",
         "CRITICAL"),

        ("2. Refunded users keep pro access indefinitely",
         "The webhook handler has no REFUND event case in its switch statement. When Apple/Google processes a refund, RevenueCat sends a REFUND event that falls through to the default case (return 200, no state change). The user's subscription stays 'active' forever.",
         "Direct revenue loss on every refund",
         "CRITICAL"),

        ("3. AI chat prompt injection via unsanitized user data",
         "sanitizeForPrompt() in ai-chat has zero tests. User-controlled fields (goal title, promise text) are injected into the system prompt after sanitization. If sanitization regresses, an attacker could inject system-level instructions to override Drift's persona or extract system prompt content.",
         "AI safety violation, brand damage, data exfiltration",
         "CRITICAL"),

        ("4. Session lost after app crash (restoreTimerFromMMKV untested)",
         "The entire restoreTimerFromMMKV action (9 branches) has zero tests. This is the code path that recovers a user's in-progress focus session after app crash or force-close. A bug here means a user who spent 45 minutes focusing loses their session permanently.",
         "User data loss, trust destruction, potential churn",
         "HIGH"),

        ("5. Route protection guard regression",
         "The useProtectedRoute hook in _layout.tsx (5 branches) has zero tests. This is the only thing preventing unauthenticated users from accessing the main app. A single regression in the segment check could expose all screens without auth.",
         "Complete auth bypass, unauthorized data access",
         "HIGH"),

        ("6. Trial activation double-charge via CAS guard regression",
         "The activate-trial CAS guard (.not('status','in','(\"active\",\"trialing\")')) is the only thing preventing duplicate trials. With zero tests, a Supabase query builder API change or typo in the status string could silently allow users to re-activate trials indefinitely.",
         "Revenue loss from infinite free trials",
         "HIGH"),

        ("7. Session rating app-quit fallback never verified",
         "session-rating.tsx has a fallback path for when the app was quit during a session (no currentSession in store). It uses dynamic import of session.service to call endSession directly. This path has never been tested and involves a completely different code path than the normal flow.",
         "Completed sessions silently lost, stats corrupted",
         "HIGH"),

        ("8. Check-in clarification infinite loop",
         "app/check-in.tsx has a clarification loop where the AI can respond with a clarification instead of tasks. If the AI persistently returns clarification responses, the user is stuck in an infinite loop with no escape. No test verifies loop termination or max-retry behavior.",
         "User stuck in non-functional check-in, blocked daily routine",
         "MEDIUM"),

        ("9. Database RLS policies never tested",
         "All 8 tables have RLS policies defined in migration SQL, but no integration test verifies that User A cannot read User B's data. A single misconfigured policy could expose chat messages, session data, or subscription details across users.",
         "Cross-tenant data exposure, GDPR violation",
         "HIGH"),

        ("10. Webhook idempotency deduplication regression",
         "The last_webhook_event_id deduplication check has zero tests. If this check regresses, RevenueCat retries (which happen on network timeouts) could process the same event twice, potentially double-activating or double-cancelling subscriptions.",
         "Subscription state corruption, incorrect billing",
         "HIGH"),
    ]

    for title, how, impact, severity in breakpoints:
        story.append(Paragraph(title, styles['SubSection3']))
        story.append(Paragraph(f"<b>How it breaks:</b> {how}", styles['Body']))
        story.append(Paragraph(f"<b>Impact:</b> {impact}", styles['Body']))
        story.append(Paragraph(f"<b>Severity:</b> {severity}", styles['BodyBold']))
        story.append(SP(0.05))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # 5. AUDIT TRAIL
    # ═══════════════════════════════════════════════════════════════════════
    story.append(Paragraph("5. What Was Checked (Audit Trail)", styles['SectionHead']))
    story.append(HR())
    story.append(SP())

    story.append(Paragraph("<b>Files Analyzed:</b>", styles['Body']))
    analyzed = [
        "All 15 screen files in app/ (4,350+ lines)",
        "All 5 store files in src/stores/ (1,056 lines)",
        "All 11 service files in src/services/ (924 lines)",
        "All 5 lib files in src/lib/ (228 lines)",
        "All 17 component files in src/components/ (1,100+ lines)",
        "All 6 Edge Function files in supabase/functions/ (1,525 lines)",
        "4 database migration files in supabase/migrations/",
        "All 24 test files (4,874 lines)",
        "jest.config.js, jest.setup.js, jest.fix-expo.js",
        ".github/workflows/ci.yml",
        "package.json, tsconfig.json, app.json",
    ]
    for a in analyzed:
        story.append(Paragraph(f"\u2022 {a}", styles['Bullet']))

    story.append(SP(0.15))
    story.append(Paragraph("<b>Test Files Mapped:</b>", styles['Body']))
    test_files = [
        "src/stores/__tests__/ \u2014 5 files (authStore, chatStore, goalStore, sessionStore, subscriptionStore)",
        "src/services/__tests__/ \u2014 10 files (auth, chat, checkin, goals, profile, promises, sessions, shields, subscription, tasks)",
        "src/lib/__tests__/ \u2014 2 files (mmkv, sentry)",
        "src/utils/__tests__/ \u2014 3 files (constants, time, time.additional)",
        "src/hooks/__tests__/ \u2014 1 file (useAppState)",
        "src/components/__tests__/ \u2014 3 files (Button, Card, ErrorBoundary)",
    ]
    for t in test_files:
        story.append(Paragraph(f"\u2022 {t}", styles['Bullet']))

    story.append(SP(0.15))
    story.append(Paragraph("<b>Assumptions Made:</b>", styles['Body']))
    assumptions = [
        "No tests were executed. All findings are from static code analysis and test file mapping.",
        "Coverage percentages for src/ are from the last recorded Jest --coverage run (71.95% stmt).",
        "Edge Function coverage is 0% because Jest collectCoverageFrom only covers src/ and no Deno test harness exists.",
        "Component test count excludes snapshot tests (none found).",
        "Branch counts are manual approximations based on if/else/switch/try-catch/ternary analysis.",
    ]
    for a in assumptions:
        story.append(Paragraph(f"\u2022 {a}", styles['Bullet']))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # 6. FINAL VERDICT
    # ═══════════════════════════════════════════════════════════════════════
    story.append(Paragraph("6. Final Verdict", styles['SectionHead']))
    story.append(HR())
    story.append(SP())

    story.append(Paragraph("Can this system safely go to production?", styles['SubSection']))
    story.append(SP(0.1))
    story.append(Paragraph("NO \u2014 Not without addressing critical gaps.", styles['VerdictRed']))
    story.append(SP(0.15))

    story.append(Paragraph("<b>Justification (direct, no hedging):</b>", styles['Body']))
    story.append(SP(0.05))

    justification = [
        "The revenue-critical webhook handler (revenuecat-webhook) \u2014 the code that determines who pays and who doesn't \u2014 has zero tests. This alone is a production blocker. A single regression in HMAC verification allows unauthorized subscription grants. A missing REFUND handler means every refund is free money for the user.",

        "All 6 Edge Functions (1,525 lines of server-side business logic) have zero automated tests. These functions handle authentication, rate limiting, AI interactions, data export, account deletion, and subscription management. They run in a Deno environment with no test harness configured.",

        "The session recovery path (restoreTimerFromMMKV, 9 branches) is completely untested. This is the code that preserves a user's focus session after app crash. In a productivity app, losing session data is the fastest way to destroy user trust.",

        "The route protection guard (_layout.tsx) has zero tests. This is the only barrier between unauthenticated users and all app functionality. No component test, no integration test, no E2E test verifies this works.",

        "Zero E2E tests exist. No Detox, Maestro, or Appium configuration found. Critical user flows (sign-up \u2192 onboarding \u2192 check-in \u2192 timer \u2192 rating \u2192 promise) have never been tested end-to-end.",

        "The CI pipeline runs tests but does not enforce a coverage threshold. Coverage could drop to 10% and the pipeline would still pass.",
    ]
    for j in justification:
        story.append(Paragraph(f"\u2022 {j}", styles['Bullet']))
        story.append(SP(0.05))

    story.append(SP(0.15))
    story.append(Paragraph("<b>Minimum gates before production:</b>", styles['Body']))
    gates = [
        "1. Write Deno tests for revenuecat-webhook (HMAC, all event types, idempotency) \u2014 BLOCKING",
        "2. Add REFUND + PRODUCT_CHANGE event handling to webhook \u2014 BLOCKING",
        "3. Write Deno tests for activate-trial (CAS guard, rate limit) \u2014 BLOCKING",
        "4. Write unit tests for restoreTimerFromMMKV (all 9 branches) \u2014 BLOCKING",
        "5. Write Deno tests for ai-chat (sanitization, rate limit, timeout) \u2014 HIGH",
        "6. Write component test for _layout.tsx route protection \u2014 HIGH",
        "7. Add coverage threshold to CI (e.g., 70% minimum) \u2014 HIGH",
        "8. Write RLS integration tests for cross-tenant isolation \u2014 HIGH",
        "9. Write component test for session-rating.tsx handleSave \u2014 MEDIUM",
        "10. Set up E2E framework for critical flows \u2014 MEDIUM",
    ]
    for g in gates:
        story.append(Paragraph(g, styles['Bullet']))

    story.append(SP(0.3))
    story.append(HR2())
    story.append(SP(0.1))
    story.append(Paragraph(
        f"Report generated: {datetime.now().strftime('%Y-%m-%d %H:%M')} | "
        "Methodology: Static code + test file mapping | "
        "No tests executed | All branch counts are manual approximations",
        styles['SmallNote']
    ))

    doc.build(story)
    print(f"PDF generated: {OUTPUT_PATH}")


if __name__ == "__main__":
    build_pdf()
