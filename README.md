# Familiars

### The agents meet so the humans can.

An AI familiar that breaks the ice, remembers the connections you make, and helps turn “we should hang out” into an actual plan.

Built at **HackCMU 2026**.

[Try Familiars](https://hackcmu-2026.vercel.app/familiars) · [Open the launcher](https://hackcmu-2026.vercel.app/) · [Projector view](https://hackcmu-2026.vercel.app/familiars/stage?room=HACKCMU)

## The idea

A room full of interesting people does not automatically become a room full of conversations. You still need a reason to approach someone, something better than “what do you do?”, and a way to keep the connection alive afterward.

Familiars gives that first interaction a little personality.

You introduce yourself to a creature that represents your interests. When you meet someone, your familiars meet first: they exchange a few lines, find something you share, and hand the conversation back to you.

The goal isn't to have people spend the evening talking to AI. It's to help them start talking to each other.

## How it works

### 1. Hatch your familiar

Tell it who you are, what you make, where you're from, and what you've been into lately. Speak naturally or use the text input.

Your introduction becomes a familiar with its own name, appearance, voice, and interest keywords. It might be a moth, kestrel, gecko, or pika—but its greeting comes from something you actually said.

### 2. Let your familiars meet

Enter casting mode, hold out your phone, and wiggle to cast your familiar into the room. Another person catches it on their phone.

The two creatures exchange a short, playful conversation, then reveal:

- **You both:** the thing your humans have in common.
- **Say it:** a concrete starting point for the real conversation.

Tap **We talked**, and that encounter becomes part of your social web.

### 3. Watch your web grow

Your web brings together the people you've met around shared interests. Explore your connections, find people you keep missing, and ask for an introduction through someone you both know.

At the end of the night, your familiar can turn those encounters into a personal recap: who you met, a detail worth remembering, and your place in the room.

### 4. Find your next reason to meet

Once a circle exists, the familiars have another job: finding something you could do together.

Send the scout out, review a small deck of activity suggestions, and vote on the ones you would attend. When everyone in the participating circle chooses the same card, the app reveals the match:

**It's a plan.**

Add it to your calendar and take the connection outside the app.

## The circle scout

The scout brings our research-agent approach into a social setting: start with the group's interests, look outward for relevant opportunities, and turn what comes back into something people can respond to.

Its workflow connects:

1. **Search planning:** turn shared interests into targeted queries.
2. **External discovery:** look for relevant event pages through the Querit integration.
3. **Extraction:** turn retrieved information into concise activity cards.
4. **Creative planning:** propose self-organized hangouts alongside listed events.
5. **Group agreement:** collect votes and reveal a shared choice.

Cards distinguish listed events, self-organized suggestions, and cached examples. Listed cards include their source, and a matched activity can be exported to a calendar.

The point is not an endless recommendation feed. It's a small number of options that give this particular group a reason to get together.

## AI and sponsor integrations

### IFM — the intelligence behind the familiars

We integrated **IFM K2 Horizon 375B** through a shared model layer to turn introductions into personalized familiar profiles, generate exchanges between companions, suggest conversation starters, and write recaps.

The same model layer supports the scout's query planning, event extraction, and group activity suggestions. Task-specific prompts and structured outputs connect the model's responses directly to the experience.

### ElevenLabs — voices with personality

We integrated **ElevenLabs** for both speech recognition and expressive voice output.

Spoken introductions are transcribed with **Scribe**, while the familiars speak their greetings and exchanges using **Eleven Turbo v2.5**. Voice selection is tied to each familiar's visual identity, giving the creatures a consistent presence.

Audio helps the interaction feel like a shared moment, with on-screen text alongside the spoken lines.

### Querit — a connection to the outside world

**Querit** is the search-and-retrieval integration in our circle scout. Its role is to connect the group's shared interests with information beyond the app: event listings, activity pages, and potential places to meet.

The scout combines that retrieval adapter with model-generated searches and structured extraction to build its activity deck, alongside self-organized ideas and cached demonstration cards.

### MongoDB Atlas — the shared memory

We integrated **MongoDB Atlas** as the shared data backbone for Familiars.

It stores familiar profiles, encounter connections, room membership, activity suggestions, group votes, and model-call histories. That shared state lets people on different phones participate in the same evolving experience.

The implementation uses MongoDB's document model, upserts, bounded history arrays, and TTL indexes to manage session and temporary pairing data.

## Built for a room, not just a screen

Familiars has two perspectives:

- **On your phone:** your creature, conversations, connections, and group plans.
- **On the projector:** the room's familiars, recent encounters, and model activity as it happens.

The stage view includes model names and call timings, making the AI's role visible during the demo.

Underneath, browser clients send actions to a shared server and receive updated room state through versioned polling. The same infrastructure connects the individual experience to the collective one.

## How we built it

| Layer | Technology |
| --- | --- |
| Mobile web experience | Next.js 15, React 19, TypeScript |
| Visual identity | Custom SVG creatures, CSS animation, shared UI components |
| Model reasoning | IFM K2 Horizon 375B |
| Speech input and output | ElevenLabs |
| External activity discovery | Querit integration |
| Shared session storage | MongoDB Atlas |
| Structured model outputs | JSON and Zod validation |
| Hosting | Vercel |

This repository also contains **Cast**, **Detour**, and **Palate**, companion prototypes explored during the hackathon. They share the room, model, and UI infrastructure; Familiars brings the focus back to meeting people and giving those connections somewhere to go.

## Try the demo

Open the same room on two phones:

```text
/familiars?room=HACKCMU
```

Hatch your companions, enter casting mode, and have one person cast while the other catches. After the exchange, explore the web or open **Casts → out** to try the activity deck.

For the shared display:

```text
/familiars/stage?room=HACKCMU
```

Use separate devices or browser profiles for separate identities. Allow microphone and motion access when prompted.

## What's next

We want the circle to outlast the event: recurring activity discovery, shared memories across meetups, and more ways for a familiar to help friends stay connected. We're also interested in bringing lightweight personalization onto local hardware with smaller IFM models.

The through-line stays the same: **meet someone, find your common ground, and have a reason to meet again.**

## Acknowledgments

Built for HackCMU 2026 with IFM, ElevenLabs, Querit, and MongoDB Atlas integrations.

AI-assisted development included Claude Code for planning and coding assistance, and OpenAI Codex for repository analysis and documentation.
