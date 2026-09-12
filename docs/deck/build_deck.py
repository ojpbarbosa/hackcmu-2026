"""Builds docs/deck/familiars.pptx from the rendered mockup frames.
Usage: python3 docs/deck/build_deck.py <frames_dir> <bg_dir>
"""
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

FR, BG = sys.argv[1], sys.argv[2]
prs = Presentation(); prs.slide_width = Inches(13.333); prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]
TX = RGBColor(0xF4, 0xF2, 0xFF); TX2 = RGBColor(0xC9, 0xC6, 0xE6); MUTE = RGBColor(0x8E, 0x8B, 0xB4)
GOLD = RGBColor(0xFF, 0xC8, 0x5C); MINT = RGBColor(0x7C, 0xF0, 0xC4); ROSE = RGBColor(0xFF, 0x7A, 0xA2)
F = 'Avenir Next'

def bg(s, title=False):
    s.shapes.add_picture(f'{BG}/bg-title.png' if title else f'{BG}/bg.png', 0, 0, prs.slide_width, prs.slide_height)

def text(s, x, y, w, h, runs, size=20, color=TX, bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=1.1):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h)); tf = tb.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(0); tf.margin_top = tf.margin_bottom = Inches(0)
    if isinstance(runs, str): runs = [[(runs, size, color, bold)]]
    first = True
    for para in runs:
        p = tf.paragraphs[0] if first else tf.add_paragraph(); first = False; p.alignment = align; p.line_spacing = spacing
        for (t, sz, c, b) in para:
            r = p.add_run(); r.text = t; r.font.size = Pt(sz); r.font.color.rgb = c; r.font.bold = b; r.font.name = F
    return tb

def label(s, x, y, t, color=MUTE): text(s, x, y, 9, 0.3, [[(t.upper(), 11, color, True)]])
def phone(s, i, x, y, h):
    w = h * 786 / 1704; s.shapes.add_picture(f'{FR}/f{i}.png', Inches(x), Inches(y), Inches(w), Inches(h)); return w
def tv(s, i, x, y, w):
    h = w * 922 / 1640; s.shapes.add_picture(f'{FR}/f{i}.png', Inches(x), Inches(y), Inches(w), Inches(h)); return h
def notes(s, t): s.notes_slide.notes_text_frame.text = t
def row3(s, ids, y=2.05, h=5.25):
    w = h * 786 / 1704; gap = 0.35; total = len(ids) * w + (len(ids) - 1) * gap; x = (13.333 - total) / 2
    for i in ids: phone(s, i, x, y, h); x += w + gap

# 1 title
s = prs.slides.add_slide(BLANK); bg(s, True)
label(s, 0.9, 0.9, 'HackCMU 2026 · Multiplayer · IFM · ElevenLabs', GOLD)
text(s, 0.9, 1.6, 7.2, 2.2, [[('Familiars', 88, TX, True)]], spacing=0.95)
text(s, 0.9, 3.7, 6.6, 1.6, [[('Your familiar meets theirs first.', 34, TX, False)]], spacing=1.05)
text(s, 0.9, 5.2, 6.4, 1.2, [[('A small creature, hatched from your voice, that introduces you to people, listens when your circle talks, and goes out to find you plans.', 18, TX2, False)]], spacing=1.25)
phone(s, 2, 8.6, 0.55, 6.4)
notes(s, 'This is Familiars. Everyone gets a small creature, hatched from their own voice, that meets other people’s creatures first, so you never have to send the cold text.')

# 2 problem
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.7, 'the problem')
text(s, 0.9, 1.05, 9, 1.4, [[('Everyone is in the same room. Nobody sends the first text.', 40, TX, True)]], spacing=1.0)
stats = [('57%', 'of 44,000 US college students report loneliness; 12% always.', 'Trellis, 2024'),
         ('65%', 'of students lonely in the most recent national survey.', 'Active Minds · TimelyCare, 2025'),
         ('70M', 'daily users at BeReal’s peak. A shared moment worked; a photo had nothing to say.', '2022 peak, down to ~3M by 2025'),
         ('76%', 'of group plans never leave the chat. The ones that happen take 83 messages.', '2026 survey')]
for k, (n, d, src) in enumerate(stats):
    x = 0.9 + (k % 2) * 6.2; y = 2.75 + (k // 2) * 2.05
    text(s, x, y, 2.2, 1.0, [[(n, 54, GOLD, True)]], spacing=0.9)
    text(s, x + 2.3, y + 0.12, 3.7, 1.2, [[(d, 16, TX, False)], [(src, 11, MUTE, False)]], spacing=1.2)
text(s, 0.9, 6.85, 11, 0.4, [[('“You can get a meal without talking to another human.” · The Tartan, CMU, 2024', 12, MUTE, False)]])
notes(s, 'The loneliness numbers on campus are not new: more than half of students say they are lonely. And it is not for lack of people. The problem is the first move. BeReal proved a synchronized moment brings people together, and died because a photo has nothing to say. Three out of four group plans die in the chat.')

# 3 insight
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.7, 'the idea')
text(s, 0.9, 1.05, 7.8, 2.6, [[('Manufacture the introduction.', 46, TX, True)]], spacing=1.0)
text(s, 0.9, 2.6, 6.9, 3.2, [[('Your familiar knows you. Their familiar knows them. When the two meet, you both get one line worth saying, like a recommendation from a friend who knows you both.', 22, TX2, False)], [('', 10, TX2, False)], [('It removes the cold start. It does not replace the conversation.', 22, TX, True)]], spacing=1.25)
phone(s, 5, 8.4, 0.5, 6.4)
notes(s, 'Our idea is to manufacture the introduction. Your familiar knows you, theirs knows them. They meet first and hand you one line worth saying, like a recommendation from a mutual friend. It removes the cold start and leaves the real conversation to you.')

# 4 hatch
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.55, '1 · hatch')
text(s, 0.9, 0.8, 8.0, 1.1, [[('Say who you are and what you make. It hatches from that.', 26, TX, True)]])
text(s, 9.3, 0.9, 3.4, 0.8, [[('No typing. Your name, your pronouns, what you make, where you are from: spoken, and stuck to the egg as you say them. It hatches with a name, a voice, and the four things it knows.', 13, TX2, False)]], spacing=1.2)
row3(s, [1, 2], y=1.95, h=5.4)
notes(s, 'Onboarding is one screen and no typing: you say your name, your pronouns, what you make. What you say sticks to the egg, and it hatches into a creature that is visibly based on you. Merlin here knows synths, tape loops, Recife, and 3 am.')

# 5 meet
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.55, '2 · meet')
text(s, 0.9, 0.8, 8.0, 1.1, [[('Wiggle to cast. Tap to catch. The familiars do the awkward part.', 26, TX, True)]])
text(s, 9.3, 0.9, 3.4, 0.8, [[('One phone wiggles, the other catches. The two familiars meet on a stage, speak one line each, and hand you the one thing you share.', 13, TX2, False)]], spacing=1.2)
row3(s, [3, 4, 5])
notes(s, 'This is the multiplayer core. You put your phone in casting mode, wiggle it, and the person next to you taps catch. Their familiar and yours meet on a stage, say one line each out loud, and hand you both the one thing you share. Then you talk, in person.')

# 6 web
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.7, '3 · web')
text(s, 0.9, 1.05, 5.2, 2.0, [[('Home is who you have met.', 40, TX, True)]], spacing=1.0)
text(s, 0.9, 3.2, 5.0, 3.4, [[('People stand in the interests you share. Friends of friends fade upward.', 20, TX2, False)], [('', 8, TX2, False)], [('The ones you keep missing get an introduction carried by a friend’s familiar. Nobody texts first.', 20, TX, False)]], spacing=1.25)
phone(s, 6, 6.6, 0.5, 6.4); phone(s, 7, 9.9, 0.5, 6.4)
notes(s, 'Home is your web: the people you met, standing inside the interests you share, and friends of friends fading upward. The ones you keep missing are one tap away, and the introduction is carried by a friend’s familiar.')

# 7 casts
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.7, '4 · the daily cast')
text(s, 0.9, 1.05, 5.4, 2.0, [[('One question a day, in your familiar’s voice.', 40, TX, True)]], spacing=1.0)
text(s, 0.9, 3.3, 5.2, 3.2, [[('It lands on every phone in the circle at the same second, with the circle’s own three notes. You look up, and talk.', 20, TX2, False)], [('', 8, TX2, False)], [('Nobody types. The phone listens and catches who said what.', 20, TX, False)]], spacing=1.25)
phone(s, 8, 7.4, 0.5, 6.4)
notes(s, 'Circles form from your web. Once a day, at a minute nobody knows, every phone in the circle plays the same three notes and shows the same question, written from what the circle shares. You talk about it in person; the phone listens and catches the answers.')

# 8 outings
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.55, '5 · out')
text(s, 0.9, 0.8, 8.0, 1.1, [[('Merlin goes out and finds three. Swipe. When everyone is in, it is a plan.', 26, TX, True)]])
text(s, 9.3, 0.9, 3.4, 0.8, [[('Real, current events, researched, never invented. Published ones carry a source; a made-up one says so.', 13, TX2, False)]], spacing=1.2)
row3(s, [9, 10, 11])
notes(s, 'Then your familiar goes out for the circle. It searches real, current events, checks the details, and comes back with three cards. You swipe. When everyone swipes right on the same one, it is a plan, on the calendar.')

# 9 recap
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.7, '6 · every night')
text(s, 0.9, 1.05, 5.2, 2.0, [[('Your familiar tells you the story.', 40, TX, True)]], spacing=1.0)
text(s, 0.9, 3.2, 5.0, 3.0, [[('Who it met, the line that worked, and the person who was two tables away all night.', 20, TX2, False)]], spacing=1.25)
phone(s, 12, 6.6, 0.5, 6.4); phone(s, 13, 9.9, 0.5, 6.4)
notes(s, 'And every night, the familiar tells you the story of your day: who it met, the line that worked, and the one that got away.')

# 10 room
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.55, 'the room')
text(s, 0.9, 0.85, 9, 0.8, [[('The room watches its own web form.', 30, TX, True)]])
tv(s, 14, 1.35, 1.75, 10.6)
notes(s, 'At an event, the projector shows the room’s web forming in real time, and which two familiars are on stage right now.')

# 11 how
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.6, 'how it is built')
text(s, 0.9, 0.9, 10, 0.8, [[('Every familiar is its own model. The big one runs the world.', 30, TX, True)]])
blocks = [('K2 Horizon 0.9B', GOLD, 'One instance per familiar, with its own memory, small enough to live on the person’s side. It is the voice in the duet.'),
          ('K2 Horizon 375B', GOLD, 'Hatches familiars from the transcript, writes the daily cast, brokers intros, writes the nightly recap, and reasons through the scout’s investigation loop.'),
          ('ElevenLabs', MINT, 'Speech-to-text hatches the familiar and catches the circle’s answers. Text-to-speech gives every familiar a voice.'),
          ('Querit', MINT, 'Web search and page fetch for real, current events. The model plans the queries and extracts the facts. It never invents an event.'),
          ('The wiggle', ROSE, 'DeviceMotion on both phones, matched server-side, one tap to catch. Next.js on Vercel, Upstash for shared state.')]
for k, (t, c, d) in enumerate(blocks):
    x = 0.9 + (k % 3) * 4.05; y = 2.1 + (k // 3) * 2.5
    text(s, x, y, 3.7, 0.6, [[(t, 22, c, True)]]); text(s, x, y + 0.55, 3.7, 1.8, [[(d, 14, TX2, False)]], spacing=1.25)
notes(s, 'Under the hood, every familiar is its own K2 Horizon 0.9B instance with its own memory, small enough to live on the person’s side. The 375B model hatches them, writes the casts, brokers introductions, writes the recap, and runs the scout’s investigation loop. ElevenLabs gives them ears and voices. Querit gives them the web. The wiggle is just motion sensors and one tap.')

# 12 why multiplayer
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.7, 'why multiplayer')
text(s, 0.9, 1.05, 7.6, 2.0, [[('Nothing here works with one phone.', 44, TX, True)]], spacing=1.0)
for k, (a, b) in enumerate([('The wiggle', 'needs the other phone to catch.'), ('The cast', 'needs the circle to hear the same three notes.'), ('The plan', 'needs everyone to swipe right.'), ('The intro', 'needs a friend’s familiar in the middle.')]):
    y = 3.1 + k * 0.85; text(s, 0.9, y, 2.4, 0.6, [[(a, 22, GOLD, True)]]); text(s, 3.4, y + 0.04, 6, 0.6, [[(b, 20, TX2, False)]])
phone(s, 4, 9.4, 0.7, 6.2)
notes(s, 'That is why this is a multiplayer project: nothing here works with one phone. The wiggle needs a catch, the cast needs a circle, the plan needs everyone, and the intro needs a friend in the middle.')

# 13 next
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.7, 'what is next')
text(s, 0.9, 1.05, 8, 2.0, [[('Familiars evolve with who they meet.', 44, TX, True)]], spacing=1.0)
text(s, 0.9, 3.1, 7.6, 3.4, [[('Your familiar picks up a little of everyone it meets. Circles get named by what they share. The scout learns which outings actually happened, and finds the next one.', 22, TX2, False)]], spacing=1.3)
phone(s, 6, 9.4, 0.7, 6.2)
notes(s, 'Next, familiars evolve with who they meet, circles name themselves by what they share, and the scout learns which plans actually happened.')

# 14 close
s = prs.slides.add_slide(BLANK); bg(s, True)
text(s, 0.9, 2.3, 8, 2, [[('Familiars', 80, TX, True)]], spacing=0.95)
text(s, 0.9, 4.3, 8, 1.2, [[('Meet through your familiar.', 30, TX2, False)]])
label(s, 0.9, 6.3, 'Built at HackCMU 2026 · Multiplayer · IFM K2 Horizon · ElevenLabs · Querit', GOLD)
phone(s, 2, 8.9, 0.55, 6.4)
notes(s, 'Familiars. Meet through your familiar. Thank you.')

prs.save('docs/deck/familiars.pptx'); print('slides', len(prs.slides))
