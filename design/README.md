# GD Verification design system (approved 12 Oct 2026)

Open `design-system.html` in a browser to see every part. Published copy: https://claude.ai/artifact/QsBkcgcRmLhLyTZkFf8Mqm

Approved decisions:
- Colours: brand #0b6b41 (dark mode #74d6a4), banner green #01411C; neutrals lean green (bg #f1f4f2, card #fff, ink #15201b, muted #56645d, line #d2dbd6; dark bg #0e1411, card #16201b, ink #e6ece8, muted #97a59d, line #29352f).
- Decision colours, used ONLY for decisions, same in both apps: Release #17854a, Detain #b97a08, Seize #c62f26 (soft chips: #e1f2e7/#1c6b41, #fcefd3/#8a5a00, #fbe8e6/#b0202b; dark: #15301f/#7fd49b, #3a2e12/#f2c063, #3a1c1a/#ff8a80). The control room's current #15803d/#d97706/#b91c1c are replaced.
- Type: Barlow Semi Condensed (headings, stamps, decision words) and Inter (everything else), from the fonts folder. Sizes 32/24/18/16/14/12 plus 36 for counters. Body text 16. Nothing to act on below 14.
- Spacing 4/8/12/16/24/32; corners 6/10/14/round; two shadow levels (border instead of shadow in dark mode).
- Touch targets at least 48 px; decision buttons 56 px, bold capitals 18 px; main action at the bottom of the phone screen; form fields 52 px with 17 px text.
- Icons: one outline set, 24 px grid, 1.75 stroke, rounded ends (paths in design-system.html, variable IC). Replaces the coloured icons.
- Wording: "Case" (never file/scan/capture), Release/Detain/Seize and Released/Detained/Seized, "Decision pending", "Post", "Vehicle number", "Goods found", "Sign in", "username", "PIN", "phone" (never device), roles Owner/Officer/Bn Staff/Post Staff, "Operations Room" for the Mac app (renamed from Control room on 12 Oct). Buttons start with a verb, at most three words; errors say what to do next; no "please" or "successfully"; dates as 12 Oct, 08:42.
