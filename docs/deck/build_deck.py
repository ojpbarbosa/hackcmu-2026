"""Builds docs/deck/familiars.pptx from the rendered mockup frames.
Usage: python3 docs/deck/build_deck.py <frames_dir> <bg_dir> [font]
Frames: f1 talk, f2 hatched, f3 casting, f4 catch, f5 duet, f6 web, f7 missed,
f8 cast, f9 scouting, f10 swipe, f11 match, f12 you, f13 recap, f14 projector (tv).
"""
import sys
from PIL import Image, ImageDraw, ImageFilter
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

FR, BG = sys.argv[1], sys.argv[2]
prs = Presentation(); prs.slide_width = Inches(13.333); prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]
INK = RGBColor(0x1B, 0x15, 0x48); INK2 = RGBColor(0x4B, 0x46, 0x70); MUTE = RGBColor(0x8A, 0x86, 0xAA)
ACC = RGBColor(0x6C, 0x4D, 0xE0)
PILL_BG = RGBColor(0xEF, 0xEA, 0xFF); PILL_TX = RGBColor(0x4E, 0x36, 0xB8)
F = sys.argv[3] if len(sys.argv) > 3 else 'Arial'


def make_bg(path, title=False):
    w, h = 1920, 1080
    im = Image.new('RGB', (w, h), (255, 255, 255))
    d = ImageDraw.Draw(im)
    blobs = [((-200, -300, 900, 700), (233, 225, 255)), ((1200, 500, 2300, 1400), (255, 225, 238)),
             ((900, -400, 1900, 400), (241, 236, 255)), ((-300, 700, 700, 1500), (255, 236, 244))]
    if title:
        blobs.append(((1100, 100, 2000, 1000), (228, 218, 255)))
    for box, col in blobs:
        d.ellipse(box, fill=col)
    im = im.filter(ImageFilter.GaussianBlur(160))
    im.save(path)


make_bg(f'{BG}/bg.png'); make_bg(f'{BG}/bg-title.png', True)


def bg(s, title=False):
    s.shapes.add_picture(f'{BG}/bg-title.png' if title else f'{BG}/bg.png', 0, 0, prs.slide_width, prs.slide_height)


def text(s, x, y, w, h, runs, size=20, color=INK, bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=1.1):
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
def row(s, ids, y=1.85, h=4.75):
    w = h * 786 / 1704; gap = 0.35; total = len(ids) * w + (len(ids) - 1) * gap; x = (13.333 - total) / 2
    for i in ids: phone(s, i, x, y, h); x += w + gap


def tech(s, items, y=6.72):
    """The strip that keeps the technical story on every slide: name · what it does here.
    Shrinks the whole row when it would run past the right margin."""
    widths = [0.28 + 0.088 * len(n) + 0.072 * len(w) + 0.2 for n, w in items]
    total = sum(widths) + 0.14 * (len(items) - 1)
    k = min(1.0, (13.333 - 1.8) / total)
    size = max(8.5, 11 * k); x = 0.9
    for (name, what), w in zip(items, widths):
        w *= k
        pill = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(0.42))
        pill.adjustments[0] = 0.5; pill.fill.solid(); pill.fill.fore_color.rgb = PILL_BG; pill.line.fill.background(); pill.shadow.inherit = False
        tf = pill.text_frame; tf.word_wrap = False; tf.margin_left = tf.margin_right = Inches(0.14 * k); tf.margin_top = tf.margin_bottom = Inches(0); tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]; p.alignment = PP_ALIGN.LEFT
        r = p.add_run(); r.text = name; r.font.size = Pt(size); r.font.bold = True; r.font.color.rgb = PILL_TX; r.font.name = F
        r = p.add_run(); r.text = f'  {what}'; r.font.size = Pt(size); r.font.bold = False; r.font.color.rgb = INK2; r.font.name = F
        x += w + 0.14 * k


# 1 title
s = prs.slides.add_slide(BLANK); bg(s, True)
label(s, 0.9, 0.9, 'HackCMU 2026 · Multiplayer · IFM · ElevenLabs', ACC)
text(s, 0.9, 1.6, 7.2, 2.2, [[('Familiars', 88, INK, True)]], spacing=0.95)
text(s, 0.9, 3.7, 6.6, 1.6, [[('Your familiar meets theirs first.', 34, INK, False)]], spacing=1.05)
text(s, 0.9, 5.1, 6.2, 1.2, [[('A small creature, hatched from your voice, that introduces you to people and finds you plans.', 18, INK2, False)]], spacing=1.25)
phone(s, 2, 8.6, 0.55, 6.4)
tech(s, [('K2 Horizon', '0.9B per person, 375B for the world'), ('ElevenLabs', 'voice in, voice out'), ('Querit', 'real events')])
notes(s, 'This is Familiars. Everyone gets a small creature, hatched from their own voice, that meets other people’s creatures first, so you never have to send the cold text.')

# 2 problem
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.7, 'the problem')
text(s, 0.9, 1.05, 9, 1.4, [[('Everyone is in the same room. Nobody sends the first text.', 40, INK, True)]], spacing=1.0)
stats = [('57%', 'of 44,000 US college students report loneliness.', 'Trellis, 2024'),
         ('65%', 'of students lonely in the latest national survey.', 'Active Minds · TimelyCare, 2025'),
         ('70M', 'daily users at BeReal’s peak. A photo had nothing to say.', 'down to ~3M by 2025'),
         ('76%', 'of group plans never leave the chat.', '83 messages for the ones that do')]
for k, (n, d, src) in enumerate(stats):
    x = 0.9 + (k % 2) * 6.2; y = 2.75 + (k // 2) * 1.9
    text(s, x, y, 2.2, 1.0, [[(n, 54, ACC, True)]], spacing=0.9)
    text(s, x + 2.3, y + 0.12, 3.7, 1.2, [[(d, 16, INK, False)], [(src, 11, MUTE, False)]], spacing=1.2)
text(s, 0.9, 6.5, 11, 0.4, [[('“You can get a meal without talking to another human.” · The Tartan, CMU, 2024', 16, INK, False)]])
notes(s, 'More than half of students say they are lonely, and it is not for lack of people. The problem is the first move. BeReal proved a synchronized moment brings people together, and died because a photo has nothing to say. Three out of four group plans die in the chat.')

# 3 idea
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.7, 'the idea')
text(s, 0.9, 1.05, 7.8, 1.4, [[('AI warm intros.', 46, INK, True)]], spacing=1.0)
text(s, 0.9, 3.05, 6.9, 3.0, [[('Each person gets a familiar: a small model that runs locally, on their side, and knows only them.', 22, INK2, False)], [('', 10, INK2, False)], [('Two familiars meet first. You get one line worth saying.', 22, INK, True)]], spacing=1.25)
phone(s, 5, 8.4, 0.5, 6.0)
tech(s, [('K2 Horizon 0.9B', 'one per person, local, your own agent'), ('K2 Horizon 375B', 'the shared world: matching, intros, recaps')])
notes(s, 'Our idea is to manufacture the introduction. Each person gets a familiar: a K2 Horizon 0.9B model that runs locally and knows only them. Two familiars meet first and hand you one line worth saying. The 375B model runs the shared world around them.')

# 4 hatch
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.55, '1 · hatch')
text(s, 0.9, 0.8, 8.0, 1.1, [[('Say who you are. It hatches from that.', 28, INK, True)]])
text(s, 9.3, 0.9, 3.4, 1.0, [[('No typing. Name, pronouns, what you make, where you are from: spoken, stuck to the egg, hatched.', 13, INK2, False)]], spacing=1.2)
row(s, [1, 2])
tech(s, [('ElevenLabs Scribe', 'speech to text while you talk'), ('K2 375B', 'hatches name, keywords, greeting'), ('K2 0.9B', 'your familiar from here on')])
notes(s, 'Onboarding is one screen and no typing. ElevenLabs Scribe transcribes as you talk, the 375B hatches a creature from the transcript, and from then on a 0.9B instance is your familiar.')

# 5 meet
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.55, '2 · meet')
text(s, 0.9, 0.8, 8.0, 1.1, [[('Wiggle to cast. Tap to catch.', 28, INK, True)]])
text(s, 9.3, 0.9, 3.4, 1.0, [[('One phone wiggles, the other catches. The two familiars talk on a stage and hand you the one thing you share.', 13, INK2, False)]], spacing=1.2)
row(s, [3, 4, 5])
tech(s, [('DeviceMotion', 'the wiggle, matched server-side'), ('K2 0.9B × 2', 'the two familiars write the duet'), ('ElevenLabs TTS', 'a voice per familiar')])
notes(s, 'This is the multiplayer core. Casting mode, one wiggle, one tap on the other phone. The two 0.9B familiars write the duet, ElevenLabs gives each a voice, and you both get the one thing you share. Then you talk, in person.')

# 6 web
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.7, '3 · web')
text(s, 0.9, 1.05, 5.2, 2.0, [[('Home is who you have met.', 40, INK, True)]], spacing=1.0)
text(s, 0.9, 3.2, 5.0, 3.0, [[('People stand in the interests you share. Friends of friends fade upward.', 20, INK2, False)], [('', 8, INK2, False)], [('The ones you keep missing get an intro carried by a friend’s familiar.', 20, INK, False)]], spacing=1.25)
phone(s, 6, 6.6, 0.5, 5.9); phone(s, 7, 9.9, 0.5, 5.9)
tech(s, [('K2 375B', 'groups the web by shared interests, writes the intro line'), ('Next.js · Vercel · MongoDB Atlas', 'one shared room for every phone')])
notes(s, 'Home is your web: the people you met, grouped by what you share, and friends of friends fading upward. The 375B writes the intro line, and a friend’s familiar carries it.')

# 7 casts
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.7, '4 · the daily cast')
text(s, 0.9, 1.05, 5.4, 2.0, [[('One question a day, in your familiar’s voice.', 40, INK, True)]], spacing=1.0)
text(s, 0.9, 3.3, 5.2, 3.0, [[('It lands on every phone in the circle at the same second. You look up and talk.', 20, INK2, False)], [('', 8, INK2, False)], [('Nobody types. The phone listens.', 20, INK, False)]], spacing=1.25)
phone(s, 8, 7.4, 0.5, 5.9)
tech(s, [('K2 375B', 'writes the question from the circle’s interests'), ('ElevenLabs', 'TTS asks it, Scribe listens to the answers')])
notes(s, 'Every night one question lands on every phone in the circle at the same second, in the familiar’s voice. Nobody types: the phone listens while you talk.')

# 8 out
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.55, '5 · out')
text(s, 0.9, 0.8, 8.0, 1.1, [[('Merlin goes out and finds three. Swipe.', 28, INK, True)]])
text(s, 9.3, 0.9, 3.4, 1.0, [[('Real events, with the source. When everyone swipes right on the same one, it is a plan.', 13, INK2, False)]], spacing=1.2)
row(s, [9, 10, 11])
tech(s, [('Querit', 'web search and page fetch for real events'), ('K2 375B', 'plans the queries, extracts the facts, never invents'), ('K2 0.9B', 'personal familiar acts on your behalf locally')])
notes(s, 'Send your familiar out. Querit searches and fetches real pages, the 375B plans the queries and extracts the facts, and it never invents an event. Three cards, swipe, and when everyone is in, it is a plan.')

# 9 recap
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.7, '6 · every night')
text(s, 0.9, 1.05, 5.6, 2.0, [[('Your familiar tells you the story.', 40, INK, True)]], spacing=1.0)
text(s, 0.9, 3.2, 5.2, 2.2, [[('Who it met, the line that worked, and the person who was two tables away all night.', 20, INK2, False)]], spacing=1.25)
phone(s, 12, 6.6, 0.5, 5.9); phone(s, 13, 9.9, 0.5, 5.9)
tech(s, [('K2 375B', 'writes the recap from the day’s web'), ('ElevenLabs TTS', 'your familiar tells it')])
notes(s, 'Every night your familiar tells you the story: who it met, the line that worked, and the person who was two tables away all night. The 375B writes it from the day’s web; your familiar’s voice tells it.')

# 11 why multiplayer
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.7, 'why multiplayer')
text(s, 0.9, 1.05, 7, 1.4, [[('Nothing here works with one phone.', 40, INK, True)]], spacing=1.0)
rows = [('The wiggle', 'needs the other phone to catch.'), ('The cast', 'needs the circle to hear the same three notes.'), ('The plan', 'needs everyone to swipe right.'), ('The intro', 'needs a friend’s familiar in the middle.')]
for k, (a, b) in enumerate(rows):
    y = 3.0 + k * 0.72
    text(s, 0.9, y, 2.4, 0.5, [[(a, 20, ACC, True)]]); text(s, 3.3, y, 5.0, 0.5, [[(b, 20, INK2, False)]])
phone(s, 4, 8.8, 0.5, 5.9)
tech(s, [('K2 0.9B', 'one agent per person'), ('K2 375B', 'the shared world between them')])
notes(s, 'Every feature needs the other phone. The wiggle needs a catch, the cast needs the circle, the plan needs everyone, the intro needs a friend’s familiar in the middle.')

# 12 next
s = prs.slides.add_slide(BLANK); bg(s)
label(s, 0.9, 0.7, 'what is next')
text(s, 0.9, 1.05, 7, 1.4, [[('Familiars evolve with who they meet.', 40, INK, True)]], spacing=1.0)
text(s, 0.9, 2.9, 6.6, 2.4, [[('Your familiar keeps a memory of everyone it meets. Circles get named by what they share. The scout learns which outings happened and finds the next one.', 20, INK2, False)]], spacing=1.25)
phone(s, 6, 8.8, 0.5, 5.9)
tech(s, [('K2 0.9B', 'memory stays on your side'), ('K2 375B', 'learns the room, not the person')])
notes(s, 'Your familiar keeps a memory of everyone it meets, on your side. The 375B learns the room. The scout learns which outings actually happened and finds the next one.')

# 13 close
s = prs.slides.add_slide(BLANK); bg(s, True)
text(s, 0.9, 2.4, 7.4, 1.6, [[('Familiars', 88, INK, True)]], spacing=0.95)
text(s, 0.9, 4.2, 7, 1.0, [[('Meet through your familiar.', 30, INK2, False)]])
label(s, 0.9, 6.7, 'built at HackCMU 2026 · Multiplayer · IFM K2 Horizon · ElevenLabs · Querit', MUTE)
phone(s, 12, 8.6, 0.55, 6.4)
notes(s, 'Familiars. Meet through your familiar.')

prs.save('docs/deck/familiars.pptx')
print('slides', len(prs.slides))
