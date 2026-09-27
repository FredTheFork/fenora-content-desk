# -*- coding: utf-8 -*-
"""
Fenora Pro content library — Part A
Pillars: TRADE PAIN, NERD DETAIL
"""

# House visual styles. Appended to every image prompt automatically by the dashboard.
STYLES = {
    "photo-real": (
        "Photorealistic editorial photograph, UK domestic architecture, soft overcast British daylight, "
        "shot on 35mm, shallow depth of field, muted natural palette of slate grey, birch plywood, "
        "anthracite and warm oak. Documentary realism, not glossy advertising. "
        "Absolutely no text, no captions, no logos, no watermarks, no UI overlays."
    ),
    "photo-trades": (
        "Photorealistic candid documentary photograph of a UK tradesperson at work, hi-vis and worn workwear, "
        "tools and laser measure in frame, overcast British daylight, van or scaffold hinted in background, "
        "slightly chaotic and real, not staged. Muted natural palette, 35mm, shallow depth of field. "
        "Absolutely no text, no captions, no logos, no watermarks, no UI overlays."
    ),
    "illustration": (
        "Bold flat vector editorial illustration in the style of a British broadsheet newspaper cartoon, "
        "heavy confident linework, flat colour blocking, limited palette of ink navy, mustard, brick red, "
        "warm off-white and anthracite. Slight paper grain texture. Single clear focal gag, simple background. "
        "Absolutely no text, no speech bubbles, no letters, no logos, no watermarks."
    ),
    "screen-mock": (
        "Clean product photograph of a modern desktop software interface floating at a slight angle, "
        "dark charcoal UI with orange accent, crisp data tables and technical window drawings, "
        "soft neutral studio background with realistic reflections and shadow. "
        "Abstract unreadable micro-text only. No legible words, no logos, no watermarks."
    ),
    "textcard": (
        "Full-bleed typographic poster background, deep anthracite charcoal with subtle warm grain texture "
        "and a faint technical line drawing of a window elevation in the lower third at 6% opacity. "
        "Empty centre space reserved for overlaid text. "
        "Absolutely no text, no letters, no logos, no watermarks."
    ),
}

POSTS = []


def post(pid, pillar, fmt, hook, body, prompt, style="photo-real",
         tags="core", platforms="IG,FB,LI", cta="", cta_fb="", li_lead="", img="", series=""):
    POSTS.append(dict(
        id=pid, pillar=pillar, format=fmt, hook=hook, body=body, prompt=prompt,
        style=style, tags=tags, platforms=platforms, cta=cta, cta_fb=cta_fb or cta,
        li_lead=li_lead, img=img, series=series,
    ))


# ═══════════════════════════════════════════════════════════════════
# PILLAR 1 — TRADE PAIN
# ═══════════════════════════════════════════════════════════════════

post("TP-01", "trade-pain", "static",
     "“It’s an easy fit, my brother-in-law said.”",
     "“It’s an easy fit.”\n\nThree words that have ended more window careers than any health and safety course.\n\nThe brother-in-law has never touched a reveal. The brother-in-law does not know the cavity is 40mm short of the frame. The brother-in-law has never had to scribe a 6mm wedge into a brick corner while a customer watches from a Velux.\n\nEasiest job in the world. Ten out of ten.",
     "Photorealistic wide shot of a large bay window in a messy Victorian UK living room, roller blind half raised, workbench and timber offcuts in the foreground, dust sheets, tools scattered, a single surprised looking workman in hi-vis standing back with a tape measure, flat daylight, the classic 'this is a big job' reveal",
     "photo-trades", "pain")

post("TP-02", "trade-pain", "static",
     "“The wall is straight.” It is not.",
     "The reveal said 70mm.\nThe reveal measured 52mm.\nThe reveal is 70mm at the top and 52mm at the bottom and 61mm in the middle, because of course it is.\n\nThe client told me three times the wall was straight. The client was standing in front of the wall. The client could not see the wall.\n\nThe wall is a 1920s extension, built by a man who was very keen on doing things his own way.",
     "Close-up photorealistic shot of a crooked, wonky UK brick window reveal, brickwork visibly sagging and uneven, a spirit level laid across the cill showing the bubble dead centre-left, tape measure hooked on a worn timber cill, grey overcast light, clinical and damning",
     "photo-real", "pain")

post("TP-03", "trade-pain", "static",
     "Size: 1200 × 1650. Reality: 1196 × 1652. Pride: gone.",
     "Quoted 1200 × 1650.\nSurveyed 1196 × 1652.\n\nFour millimetres of humbling. Four millimetres that turn a 20 minute install into a 4 hour one with scribing, packing, foam and prayer.\n\nEvery fitter alive has a number they check and pray is still there when they get to site. Mine was 1650. It was 1652.",
     "Extreme close-up photorealistic photograph of a digital laser measure display reading 1652mm held against a white painted window reveal, a steel rule and a pencil in frame, shallow depth of field, cold grey window light, sense of quiet devastation",
     "photo-trades", "pain")

post("TP-04", "trade-pain", "reel",
     "POV: the customer watched the whole job from the Velux",
     "POV: you’re on day 2 of a two day job and the customer has been watching you from the bathroom Velux for forty minutes.\n\nYou can feel it. You can feel the eyes. You are not being inspected, you are being watched, and there is a difference.",
     "Photorealistic low-angle shot looking up from a garden at a very small bathroom roof window, a silhouette of a person with binoculars looking down through the glass, a tradesperson below carrying a frame, slightly menacing comedic framing, overcast UK sky",
     "photo-real", "pain")

post("TP-05", "trade-pain", "static",
     "“Just while you’re here…”",
     "“Just while you’re here…”\n\nThe six words that turned a £4,200 job into a £4,200 job that goes on for three more days.\n\nThe leak is now in the roof. The flue is now in the roof. The gate post is now rotten. The dog is now inside.",
     "Photorealistic chaotic UK domestic hallway scene mid-renovation, a fitter in hi-vis holding a flat tool in a 'wait what' freeze-frame pose, a stepladder open behind him, a leaking ceiling stain, a lead-lined dog lead curling across the floorboards, half-installed internal door, hard comedic tension, overcast light",
     "photo-trades", "pain")

post("TP-06", "trade-pain", "static",
     "The reveal is fine. The reveal is always fine. The problem is above it.",
     "Nobody looks up.\n\nCustomer looks at the wall. Fitter looks at the reveal. Surveyor looks at the reveal. Office looks at the spreadsheet. Everyone agrees the reveal is fine.\n\nMeanwhile the lintel is 12mm out of level, the cavity is full of 1980s expanding foam, and there is a cast iron soil pipe sitting exactly where the frame needs to go.\n\nThe window was never the problem.",
     "Photorealistic detail shot looking up into a UK window opening before fitting, exposed old timber lintel badly packed with yellowed expanding foam, a cast iron soil pipe running vertically through the opening, old bird nest debris, single work light, documentary and grim",
     "photo-real", "pain")

post("TP-07", "trade-pain", "static",
     "47 frames. One vehicle. 2,180mm. Sorted.",
     "Luton with a rack, ready for the big delivery.\n\n11 windows. 2 doors. Longest frame 2,180mm. Estimated 742kg of a 1,100kg payload.\n\nThen the customer said “can you get it all on one van” and my office went quiet.",
     "Photorealistic wide shot of a fully loaded white Luton van with side rack raised at a UK workshop loading bay, huge timber and uPVC window frames strapped and stacked, straps, blankets, a driver in hi-vis checking a clipboard, industrial overcast light, satisfying and slightly terrifying",
     "photo-trades", "pain")

post("TP-08", "trade-pain", "static",
     "“We’re just out of…” and then silence",
     "“We’re just out of white silicone.”\n\nI say it. Every single fitter has said it. Somewhere in a van on the M4 there is a tube of white silicone and there will be until Thursday.\n\nYou look at the tube. You look at the bead. You look at the tube again. You squeeze. Nothing. You look at the date. 2019.\n\nThe job does not stop. You clear the joint, mask it, fit it, and hope.",
     "Photorealistic close-up of a gloved tradesperson squeezing an old squeezed-out tube of white silicone onto a masking-taped window joint, a fine bead emerging, grim expression not visible, van interior background out of focus, cold morning light through a van door",
     "photo-trades", "pain")

post("TP-09", "trade-pain", "static",
     "The variation landed in the office, the job left the workshop.",
     "This is the one that keeps me up.\n\nSurvey says the opening is 4mm different. Surveyor photographs it, notes it, and flags the variation on his phone. Meanwhile the office has already released the job, the workshop has already cut, and the frame is on a van.\n\nThe photo was in a WhatsApp group. Nobody was in the WhatsApp group. The surveyor was in Fenora. The office was in a spreadsheet.\n\nSame job. Two systems. One remake.",
     "Photorealistic melancholy split-implied scene: a workshop bench with a half-finished timber window frame and a cut list printout beside it, a mobile phone face-up on the bench showing a photo of a window opening, a label maker, silence and cold fluorescent light, sense of a mistake about to happen",
     "photo-trades", "pain", cta="This is the problem Fenora exists to kill. Link in bio.",
     li_lead="The most expensive line in window manufacturing is the remake. And the most common cause of a remake is not a bad frame. It is two systems that never met.")

post("TP-10", "trade-pain", "reel",
     "Things a fitter knows that a customer never will",
     "Things a fitter knows that the customer never will:\n\n1. That cill needs a 5mm fall and it will never have one\n2. The trickle vent is 40mm from the head and the head is 40mm lower than the drawing\n3. That wall is 8mm out of plumb and will stay that way forever\n4. The old frame was packed with a rolled-up newspaper from 1994\n5. The colour will look different in this light and there is nothing anyone can do about it\n\nNobody asked. Nobody ever asks. We just know.",
     "Photorealistic portrait-orientation montage-friendly single image: a tradesperson in workwear standing in a half-installed UK room, gesturing at a window like an exasperated explainer, six tiny invisible detail areas, warm late afternoon light through the opening, cinematic 9:16 framing",
     "photo-trades", "pain", img="9:16")

post("TP-11", "trade-pain", "static",
     "My least favourite four words in the English language.",
     "“Is it meant to do that?”\n\nYou are 40 minutes into a fitting. The room is upside down. There is foam on the floor and a vacuum cleaner that stopped working in 2011.\n\n“Will it stop doing that when the glass is in?”\n\nNo. It will stop doing that when I shim the bottom corner. Give me nine minutes.\n\n“You’ve got nine minutes?”\n\nI do not.",
     "Photorealistic interior of a UK hallway mid-install, tools and vacuum cleaner on the floor, a sash sitting slightly proud on a workbench, a customer's hand pointing from a doorway in soft focus foreground, a tradesperson mid-shim in the background, tense comedic staging",
     "photo-real", "pain")

post("TP-12", "trade-pain", "static",
     "4, 3, 2, 1… “what have you done to my room?”",
     "Fitted at 9am. Done by 3pm. Swept up. Hoovered the customer’s carpet with my own vacuum because mine is broken.\n\n“Wow — that was quick, wasn’t it.”\n\nIt was quick because I was there at 7:40 drinking a coffee you offered me while your neighbour watched through the window taking notes on how long we took.",
     "Photorealistic tidy finished UK room with a brand new white uPVC casement, sunlight across a hoovered carpet, a workman in workwear putting his tools into a bag in the corner, a vacuum cleaner visible, a pair of muddy boots neatly by the door, calm domestic satisfaction",
     "photo-trades", "pain")

post("TP-13", "trade-pain", "static",
     "Priced 14. Yesterday I said 11. Today I say 13.",
     "Scope it yourself and you can move the price all day long.\n\nMonday: £11,000.\nTuesday: £14,000 — “we forgot the french doors.”\nWednesday: £9,500 — “it’s an easy fit.”\nThursday: £13,000 — “I’ve had a cheaper one.”\nFriday: £10,000 — “that first quote was a mistake, make it 11.”\n\nMonday: £10,000.\n\nNobody in this trade believes a number until three people have quoted a different one.",
     "Photorealistic overhead flat lay of a kitchen table covered in crumpled window quotes with different figures circled, a biro, a calculator, a cold mug of tea, a phone face-up showing a text conversation, warm domestic overhead light, quiet chaos",
     "photo-real", "pain")

post("TP-14", "trade-pain", "static",
     "“I’ve watched a video.”",
     "Customer has watched eleven videos.\n\nCustomer now knows that the industry standard is to fit with 8mm of closed-cell foam behind the frame. Customer believes the frame should be screwed into the brick. Customer has opinions about the gap.\n\nCustomer is not wrong about the foam. Customer is about to be very wrong about the brick.\n\nThere is no coming back from “I’ve watched a video.”",
     "Photorealistic scene: a customer sitting in a plush armchair holding a tablet showing a blurry DIY video, wearing a dressing gown, gesturing towards the window, a fitter standing nearby with a slowly closing smile and a foam gun over his shoulder, warm lamp light, comedic",
     "photo-trades", "pain")

post("TP-15", "trade-pain", "reel",
     "Every job ever, ranked by how long the customer said it would take",
     "How long they said: two days.\nHow long the job is: eleven weeks of drip-by-drip decisions.\n\nDay 1 they choose the glass.\nDay 4 they change the glass.\nDay 9 they change the colour.\nDay 12 they want the colour to match the door, not the door to match the window.\nDay 30 they ask if it can be in eggshell.\n\nIt cannot be in eggshell.",
     "Photorealistic 9:16 shot of a paint swatch fan deck held open in front of a partly installed white uPVC window, dozens of near-identical white and cream paint cards, a fitter's head tipped back with eyes closed, resigned energy, overcast light",
     "photo-real", "pain", img="9:16")

post("TP-16", "trade-pain", "static",
     "Old frames come out. The hole is worse than you thought.",
     "The best bit of every window job is the moment the old frame comes out and the hole is just a rectangular hole in a wall.\n\nFor about nine seconds, the job is easy.\n\nThen you see the sill, the lintel, the reveals, the three different DPCs laid by three different builders, and a length of lead pipe that goes nowhere.",
     "Photorealistic shot of a rectangular hole left in a UK brick wall where an old window frame was removed, crumbling plaster, old DPC sheeting curling, a spirit level and crowbar in the opening, daylight and a large shadow pouring through, slightly triumphant and slightly ominous",
     "photo-real", "pain")

post("TP-17", "trade-pain", "static",
     "There is always a dog.",
     "There is always a dog.\n\nAnd there is always a moment — usually ten minutes in — when the dog decides this is now their job.\n\nThe dog has a name. The dog is friendly. The dog is standing in the exact spot you need to be for the next forty minutes.\n\nYou cannot move a Labrador. You have tried. Everyone has tried.",
     "Photorealistic photograph of a friendly yellow Labrador standing squarely in the middle of a UK hallway work area, directly in front of a stack of window frames, a tradesperson in hi-vis frozen mid-step looking down at the dog, tools on the floor, comedic, warm indoor light",
     "photo-trades", "pain")

post("TP-18", "trade-pain", "static",
     "It’s not level. I told you it wasn’t level.",
     "Hour 4, the bottom corner is 6mm proud.\n\n“I told you it wasn’t level.”\n\nYou did tell me. You told me in the first ten minutes. I wrote it down. I photographed it. I put it on the survey. I told the office. The office told the workshop. The workshop made it to the survey.\n\nAnd then the survey got lost, because it was in a different system, and nobody checked.\n\nSo: it’s not level. You told me. Now can you help me shim it?",
     "Photorealistic close-up of a shimming operation: a hand wedging a tapered hardwood packer into the bottom corner of a white window frame, a steel rule across, a spirit level wedged alongside, tiny chips of timber everywhere, intense focus, cold daylight",
     "photo-trades", "pain")

post("TP-19", "trade-pain", "static",
     "“Is it scratch or is it crack?” is not a customer question. It is a philosophy.",
     "“There’s a mark on the glass.”\n\nThere is always a mark on the glass.\n\nSometimes it’s a scratch. Sometimes it’s a reflection of the sky. Sometimes it’s a bug that got in during the last rain and is now fused to the pane. Sometimes it’s the neighbour’s security light. Sometimes it’s been there since the day it was fitted and the customer is just now, at 9pm, noticing it for the first time in two years.",
     "Photorealistic extreme close-up of a scratched glass window pane catching a reflection, a fingertip pointing at the scratch, condensation and grime around the edge, hard raking light to show the mark, forensic and funny",
     "photo-real", "pain")

post("TP-20", "trade-pain", "static",
     "Rain on the day. Every time.",
     "Survey in the rain. Fit on the day it pours. The one time you need it to be dry, it is 47mm of it and the render is soaking.\n\nYou fit wet. You foam wet. You seal wet. You know sealing wet is wrong. You do it anyway because the customer is going on holiday Friday and you have a good job doing.\n\nIn ten years that seal will fail and it will be entirely your fault and entirely the rain’s fault and entirely the client’s fault for booking it in November.",
     "Photorealistic photograph of two tradespeople in waterproofs fitting a large window in heavy UK rain, sheets of rain visibly streaking the air, half-tiled roof, a roll of polythene, both squinting, mud everywhere, dramatic grey light, cinematic and miserable",
     "photo-trades", "pain")

post("TP-21", "trade-pain", "static",
     "The payment. The actual hardest part of the job.",
     "The job took nine days.\nThe job went brilliantly.\nThe customer was delighted. The customer sent a lovely message. The customer recommended us to two neighbours.\n\n“It’ll go on the invoice.”\n\n“It did go on the invoice.”\n\n“When will it be paid.”\n\n“I’ll check with the office.”\n\nThe office will check with the customer. The customer will check with the accountant. The accountant will check with the bank. The bank will send a notification that will not be read until 6pm on a Friday.",
     "Photorealistic scene of a UK tradesperson in a van at dusk, phone in hand, looking at an unpaid invoice email, headlights on, rain on the windscreen, reflective moody blue hour light, sense of quiet betrayal by finance",
     "photo-trades", "pain")

post("TP-22", "trade-pain", "static",
     "The apprentice says the thing you told him not to say.",
     "“You’ve told him the job was two days, hasn’t you.”\n\nI have. I always do. I always say it takes longer.\n\n“Say it takes three to four days, if it’s not raining.”\n\nHalfway through day one he is on the phone: “Yeah no, he says three to four days.”\n\nDay four at 4pm: “He says it’s definitely done by six.”\n\nDay six. The apprentice has moved on to a different job. I have not.",
     "Photorealistic candid shot of a young apprentice tradesperson on a phone call in a UK street, looking slightly guilty, an older tradesperson in the background of the doorway glaring, a van with the roller door up, humorous body language, daylight",
     "photo-trades", "pain")

post("TP-23", "trade-pain", "static",
     "Sash windows. The sashes will drop.",
     "Nobody mentions this at handover.\n\nThe sashes were fine for eleven years. The sashes were fine for twelve years. Then the ropes finally gave, the weights came down, and now it takes both hands and a good deal of swearing to get the top one up.\n\nIt was not going to last forever. You knew it was not going to last forever. You bought the house anyway. You paid for the house anyway.\n\nThat is what happens when you do not specify it. That is what happens when nobody asked what the cords are made of.",
     "Photorealistic interior shot of a traditional vertical sliding sash window with the lower sash barely open, a hand straining to lift it, visible old sash cords, peeling paint, a feather duster on the sill, nostalgic and slightly tragic, warm interior light",
     "photo-real", "pain")

post("TP-24", "trade-pain", "static",
     "Fitting into a scaffold. Of course there’s a scaffold.",
     "I have fitted windows off ladders.\nI have fitted windows off scaffolding.\nI have fitted windows through a conservatory roof.\nI have fitted windows over a parked car, twice, with a tarp.\n\nI have never, in twenty years, fitted a window with simply the right amount of room around it.",
     "Photorealistic photograph of a tradesperson fitting a window from bamboo scaffolding on a narrow UK terraced house, a colleague passing tools up from a ladder, ropes and boards, a skip below, tight awkward angles, grey London sky, documentary realism",
     "photo-trades", "pain")

post("TP-25", "trade-pain", "reel",
     "The three knocks before every delivery",
     "You know the knock.\n\nIt’s not a knock, it’s a performance. Three knocks with intent. Wait for the reply. Knock again, two this time, slightly harder. Never call the bell — the bell is for pizza.\n\nIf nobody answers after the third round you have two options: leave, or stand in the rain looking like a person who has never been to a house before.",
     "Photorealistic 9:16 shot of a tradesperson in hi-vis standing at a UK front door mid-knock, hand raised, backpack of window samples on the porch, rain falling, warm light spilling from the frosted glass fanlight, cinematic, slightly awkward comedy",
     "photo-trades", "pain", img="9:16")

post("TP-26", "trade-pain", "static",
     "“It’s got a draught through it.” It has not.",
     "“I’m getting a slight draught through the double glazing, you fitted it for me.”\n\nIt is 1mm of air moving past a closed sash in a house built in 1911 with a fireplace that is a permanent hole in the building.\n\nYou can do three things:\n1. Explain why.\n2. Offer to come back and adjust it, which will make it worse.\n3. Leave a bag of cill wedges and a roll of brush sealer and explain that the fire is the draught.",
     "Photorealistic shot of a hand holding a strip of smoke/paper draught ribbon near a closed window sash to test airflow, ribbons drifting, a lit fire visible in the background of an old UK living room, moody warm light, forensic",
     "photo-real", "pain")

post("TP-27", "trade-pain", "static",
     "Your mate who ‘does a bit of everything’",
     "Brian does a bit of everything.\n\nBrian will quote your whole house. Brian will be cheaper. Brian will tell you the frame is fine, it just needs a new bit of rubber. Brian will take the money and the room will still be cold in January.\n\nBrian is not a fraud. Brian genuinely believes a draught excluder is a repair.\n\nBrian has a very full diary and he will not be able to come back for six weeks.",
     "Photorealistic wide-angle photo of a cluttered UK van interior belonging to a general handyman, mixed tools, wallpaper rolls, a length of skirting, an iron, a paint tin and a coffee cup, chaotic and slightly menacing, flat light through the rear doors",
     "photo-trades", "pain")

post("TP-28", "trade-pain", "static",
     "“Can you take it off the invoice if you sort that?”",
     "Every single job.\n\nNot the one thing. All of them. The one from the first visit, the one you did free, the one that was never in the original scope but you did anyway, and the one that is genuinely their fault.\n\n“Can you take it off the invoice if you sort that.”\n\nSorted.\n\nStill going to take it off the invoice, am I.",
     "Photorealistic close-up of a UK tradesperson's desk: an invoice printout, a pen resting on it, an invoice pad, a coffee cup, a small window rebate timber offcut, a receipt roll, moody side lighting, sense of resignation",
     "photo-real", "pain")

post("TP-29", "trade-pain", "static",
     "You didn’t build the house. You were told you would be level.",
     "The survey said level.\nThe builder said level.\nThe last three window fitters said it was fine.\nThe building inspector said level.\n\nThere is a word for a wall that is not level and the word is *built like that*, but nobody wants to hear it because the last person who said it was still holding the trowel.",
     "Photorealistic extreme close-up of a masonry spirit level bubble sitting hard against one end of the vial on a rough brick pier, dust and mortar crumbs, unforgiving flat light, the single most damning image in construction",
     "photo-real", "nerd")

post("TP-30", "trade-pain", "static",
     "Five trades, one bathroom, no one will take responsibility.",
     "Monday: the plumber says it’s the electrician.\nTuesday: the electrician says it’s the plasterer.\nWednesday: the plasterer says he’s never seen anything like it.\nThursday: the plasterer looks at the window.\n\nThe window has been in since 1994. The window is innocent. The window says nothing. The window is timber and it has done nothing but rot slowly and honestly for thirty years.\n\nThe window will not be attending on Thursday.",
     "Photorealistic photograph of a chaotic UK bathroom renovation with four different trades' vans outside, an open door, an extension lead across a wet floor, a roll of insulation, a bald patch in the plaster, someone pointing, comic chaos, overcast light",
     "photo-trades", "pain")

post("TP-31", "trade-pain", "static",
     "I don’t say this often, but the job was a pleasure.",
     "I don’t say this often, because it makes everyone suspicious.\n\nStraightforward. Square. Clean reveals. A builder who actually returned my calls. A customer who’d already moved the cat out of the room.\n\nI was in and out in two days and I would happily do it again tomorrow.\n\nAnd I am suspicious of the next one.",
     "Photorealistic photo of a perfectly finished, square, neatly installed white casement window in a modern UK kitchen, immaculate silicone lines, workman in clean workwear packing up a tidy tool bag, morning light, calm and almost suspicious in its serenity",
     "photo-trades", "pain")

post("TP-32", "trade-pain", "reel",
     "The full day, in four words",
     "FULL DAY IN FOUR WORDS:\n\n8am — “the reveal’s not what I thought.”\n11am — “we’ve run out of chrome.”\n2pm — “can you just check that.”\n4pm — “right, that’s the last one.”",
     "Photorealistic 9:16 triptych-style single frame showing one exhausted tradesperson at three different times of day in the same UK hallway, strong light changing across the frame from morning to golden hour, tools and dust throughout, cinematic time-lapse feeling",
     "photo-trades", "pain", img="9:16")

post("TP-33", "trade-pain", "static",
     "The keystone. On a window. Which nobody checks.",
     "Bottom-left block gone.\n\nFitted straight away, no check, no wedge, no ceremony. Six months later it is a 7mm gap you can see daylight through and a customer who is not quite complaining but is definitely mentioning it in a way that suggests a phone call is coming.\n\nTwo seconds. One block. That is the whole job.",
     "Photorealistic extreme close-up of a masonry keystone block with a bright wedge of daylight visible through the gap beside it, a small shim packer and a pencil in frame, forensic detail shot, hard raking daylight",
     "photo-real", "nerd")

post("TP-34", "trade-pain", "static",
     "When the old frame is still holding the wall up.",
     "You pull the screws.\nYou wiggle the frame.\nSomething big moves.\n\nThe old frame was, and I use this term with love, the only thing tying the front of this house together.\n\nPut it back. Get a prop. Get a second person. Get more props. Do not tell the customer yet, let them have their tea.",
     "Photorealistic photograph of a very old rotten timber window frame in a Victorian UK house being carefully eased out of a brick opening, the brickwork above visibly sagging, timber props and a steel Acrow prop being positioned, one tradesperson with hands on head in the background, tense and comedic",
     "photo-trades", "pain")

post("TP-35", "trade-pain", "static",
     "There is a difference between “scribed” and “fudged”",
     "Scribing is cutting the horn at an angle to follow the wall.\n\nFudging is cutting the horn at an angle and hoping the wall is what you thought it was.\n\nThey look identical from the outside. From the inside one is a joint line and one is a 6mm gap with a bead of silicone holding the world together.\n\nThe customer will find the difference. In eight years. On a Tuesday. Quietly.",
     "Photorealistic split-level close-up of a white uPVC window horn where the scribe cut follows an uneven brick line perfectly, a fine bead of fresh white silicone being applied, masking tape, tools, crisp daylight, craftsmanship",
     "photo-real", "nerd")


# ═══════════════════════════════════════════════════════════════════
# PILLAR 2 — NERD DETAIL
# ═══════════════════════════════════════════════════════════════════

post("ND-01", "nerd-detail", "carousel",
     "Astragal ≠ astragal bar",
     "Everybody in the trade knows somebody who calls it the wrong one and will not be corrected.\n\nAn astragal is the glazing bar itself — the timber or profile sitting between the panes.\n\nAn astragal bar is the metal or plastic insert that clips into it.\n\nYou can tell the difference by whether it makes a noise in the wind. If it does, you’ve got a bar and a gap.",
     "Photorealistic extreme macro photograph of a traditional window glazing bar joint, showing the astragal timber profile and a thin metal astragal bar insert clipped into its groove, dust and old paint visible, raking light revealing fine detail, museum-quality sharpness",
     "photo-real", "nerd")

post("ND-02", "nerd-detail", "carousel",
     "Box sash vs spiral sash: the whole argument in one carousel",
     "Slide 1: A box sash has ropes and weights in a box inside the jambs. The sashes sit 30–40mm apart. You can hear it move.\n\nSlide 2: A spiral sash runs on a helix in a single track. The sashes sit 20–25mm apart. It is quieter, slimmer, and easier to seal.\n\nSlide 3: The box looks better. Everyone in the room agrees the box looks better.\n\nSlide 4: The spiral is what everyone actually wants fitted and no-one admits it.",
     "Photorealistic side-by-side sectioned technical photograph comparing a traditional box sash window profile against a slim spiral sliding sash, cross-sections visible showing the rope and weight box versus the spiral helix track, studio lighting on a dark background, clean and technical",
     "screen-mock", "nerd")

post("ND-03", "nerd-detail", "static",
     "Cill projection: the number nobody ever agrees on",
     "65mm is standard.\n75mm is better in the rain.\n85mm is what your dad’s has got.\n\nThen you get to the brickwork, and the brickwork has been repointed twice since 1974 and the face is now 12mm further out than the drawing, so your 65mm cill is now a 53mm cill, and now it is not standard and not better in the rain, it is just wet.\n\nStandardise your cill projection. Write it on the job. Then argue about it once, in writing, forever.",
     "Photorealistic close-up sectioned photograph of a window cill projecting from a brick wall, a steel rule measuring the projection, rain beading on the overhang, water running back towards the wall, moody grey light, technical and beautiful",
     "photo-real", "nerd")

post("ND-04", "nerd-detail", "carousel",
     "Internal and external colour are two different colours",
     "You can have a window that is anthracite outside and pure brilliant white inside, or a sash that is a soft sage outside and a slightly different soft sage inside, and there is no reason you can’t.\n\nExcept: internal and external finishes are almost always priced as two operations. Almost always means ‘sometimes it’s one and nobody told the installer until the day.’",
     "Photorealistic photograph of a window frame cross-section showing anthracite exterior face and bright white interior face, two paint chips and an RAL swatch deck placed beside it on a workbench, studio light, product-documentary clarity",
     "photo-real", "nerd")

post("ND-05", "nerd-detail", "static",
     "Sightlines: you are selling the glass, not the window",
     "Frame 64mm.\nMullion 54mm.\nTransom 54mm.\n\nThat is 172mm of the window doing nothing at all, and in a 2400mm wide bay it is the difference between a room that feels bright and a room that feels like a conservatory full of scaffolding.\n\nSlim the sightlines and the glass gets bigger and the room gets bigger and nobody can explain why this window is £600 more than the last quote.\n\nNow you can.",
     "Photorealistic dramatic backlit photograph of a slim-profile aluminium window in a UK extension, sunlight blasting through, minimal frame lines, an empty chair silhouetted, low angle, sense of space and light, architectural photography quality",
     "photo-real", "nerd", cta="Every sightline, drawn to the millimetre. fenora.pro",
     li_lead="Slim sightlines are the single highest-leverage commercial decision in a window quote, and almost no one draws them on the quote.")

post("ND-06", "nerd-detail", "static",
     "Trickle vents. 5,000mm². Free air area. Per room.",
     "The most unglamorous 25mm of plastic on the whole window and the one everybody forgets until Building Regs ask for the calcs.\n\nA 2250mm² vent is a 2250mm² vent and it is not enough for a wet room and it is not enough for a new build and it is definitely not enough for the argument you are about to have.\n\nPut the vent in the head, not the sill. Size it from the room, not from the catalogue.\n\nPut it in the drawing so the installer doesn’t put it in the sill.",
     "Photorealistic macro photograph of a small trickle vent head detail at the top of a uPVC window frame, a steel rule next to it showing the vent aperture, a pencil and a small caliper, studio lighting on dark grey, technical",
     "photo-real", "nerd")

post("ND-07", "nerd-detail", "carousel",
     "Georgian bars vs astragal bars vs faux glazing bars",
     "Georgian bars: individual small panes, each one glazed, each one a weak point, each one expensive, each one a nightmare in a clean.\n\nAstragal bars: fewer, thicker, glued to the inside face, cheaper, stronger, and from the street you genuinely cannot tell.\n\nFaux bars: printed or applied to the glass. Looks perfect. Looks like a pub. Not for Grade II.",
     "Photorealistic photograph of three different window glazing bar treatments displayed side by side on a sample board against a wall, one heavily barred Georgian, one with astragal bars, one plain, raking daylight to show the shadow difference, showroom lighting",
     "photo-real", "nerd")

post("ND-08", "nerd-detail", "static",
     "Glass build-up, in trade order",
     "24mm, 6.12.4.2, argon, black spacer, warm edge, toughened, obscured.\n\nSay it out loud in a customer meeting and watch their face. It is the same words as every other quote. It is not the same words.\n\nWhat nobody writes down: whether the spacer is black, silver or warm edge. Whether the top pane is toughened. Whether the coated face is inside or out. Whether the calculator assumed a standard make-up when you specified a different one.\n\nFour words on a quote. Four hours of argument later.",
     "Photorealistic studio photograph of a cutaway triple glazed sealed unit on a dark surface, showing three panes, two cavities full of argon, a black warm edge spacer and a low-e coating sheen, dramatic side lighting, beautiful and precise",
     "photo-real", "nerd")

post("ND-09", "nerd-detail", "static",
     "A “flush sash” is not flush and I need everyone to know",
     "A flush casement is flush with the frame face.\n\nThat is it. That is the whole concept. The sash sits in the same plane as the outer frame.\n\nWhat it is not: flush with the reveal. Flush with the wall. Flush with anything else. It is not flush with the architect’s rendering, and the customer will ask why the new window does not look like the drawing of the old house.",
     "Photorealistic extreme side-angle photograph of a flush casement window frame, raking light along the frame face showing the sash sitting level with the outer frame, a thin pencil line used to demonstrate the plane, dark studio background, architectural detail photography",
     "photo-real", "nerd")

post("ND-10", "nerd-detail", "static",
     "A bay is not a bay. It is a geometry.",
     "A 45° canted bay loses about 30% of its glass to sightlines.\n\nA 30° bay loses about 17%.\n\nA 90° box gives you a structural pier in the middle of your living room wall.\n\nAdd a return on the end, add a door under it, add a monkey bar on top, and suddenly your “45 degree bay” is a bespoke fabrication with its own drawing, its own price and its own eight-week lead time.\n\nIt was always going to be bespoke. It was always going to have a drawing. Have the drawing before the customer picks the tile.",
     "Photorealistic 3/4 aerial photograph of a bespoke bay window with returns and an integrated door on a UK brick house, showing the canted facets and the pier, roof tiles, rendered walls, golden hour, architectural visualisation quality",
     "photo-real", "nerd")

post("ND-11", "nerd-detail", "static",
     "Coupled frames solve a real problem and nobody knows the name of it",
     "You cannot get a 6m opening to work as a single frame.\n\nSo you do two. And then you have 24 different ways to get from frame one to frame two, and the customer has to pick one, and every option has a different sightline, a different price and a different view out of the window.",
     "Photorealistic photograph of a very large UK living room window made of two coupled frames meeting at a central mullion post, a steel rule and a section drawing placed against it, showing the joint, soft daylight, clean architectural framing",
     "photo-real", "nerd")

post("ND-12", "nerd-detail", "carousel",
     "Turn a corner: casement, tilt & turn, french, or all three?",
     "Casement: cheapest, opens out, hinges eat clear glass.\n\nTilt & turn: opens in for cleaning, hinges invisible, hardware costs more.\n\nFrench: two sashes, no mullion, doubles the sightline risk, best with a shallow reveal.\n\nAll three: a bifold, and now the lead time is six weeks and the hinge selection is the whole project.\n\nGet this wrong on a ground floor rear elevation and someone is leaning out of a first floor window to clean it for the next fifteen years.",
     "Photorealistic photograph of four different window opening types displayed as physical samples on a wall, each labelled with a blank metal plate, clean showroom lighting, shallow depth of field, catalogue-like composition",
     "photo-real", "nerd")

post("ND-13", "nerd-detail", "static",
     "Your glass area calculation is probably wrong",
     "Glass area ≠ window area.\n\nIf you are comparing quotes on square metres of window, you are comparing sightlines, not daylight. Two identical 3.2m² windows can differ by 0.7m² of actual glass.\n\n0.7m² of extra glass is worth more than the customer will ever say out loud, and it is completely invisible on your quote.",
     "Photorealistic photograph of two window frames of identical overall size side by side, one with a chunky frame and one slim, each with the glass area outlined in a different translucent colour, dark neutral background, analytical and clean",
     "screen-mock", "nerd", cta="Drawn to scale, so the glass area is honest. fenora.pro")

post("ND-14", "nerd-detail", "static",
     "Termite the question nobody asks until the porch is up",
     "Door and window schedules should state:\n\nFrame material and species.\nSection size.\nFinish, inside and out.\nIronmongery, by manufacturer and model.\nGlazing make-up, by millimetre.\nBar type and depth.\nCill projection and horn detail.\nSealant and gasket specification.\nStainless grade for coastal and specified areas.\n\nNine lines. That is the difference between a quote and a guess.",
     "Photorealistic overhead flat lay of a printed window schedule document on a workbench next to pencil, steel rule, sample frame corner with profile, masking tape and a tape measure, warm workshop light, orderly and precise",
     "photo-real", "nerd")

post("ND-15", "nerd-detail", "reel",
     "The 30-second window nerd test",
     "Ask a window fitter these and watch their eyes light up:\n\n1. What’s your cill projection?\n2. Sash weight or rope and pulley?\n3. What grade of stainless for the coastal job?\n4. Is the glazing bar astragal or Georgian?\n5. What’s your reveal tolerance?\n\nIf they answer all five without hesitating, hire them. If they say “it depends on the job”, they have never thought about it.",
     "Photorealistic 9:16 portrait shot of two tradespeople in hi-vis having an animated conversation beside a wall of window samples in a UK workshop, one gesturing with a tape measure, sparks of recognition, industrial lighting, warm and energetic",
     "photo-trades", "nerd", img="9:16")

post("ND-16", "nerd-detail", "static",
     "The dog-ear sill. Every job, every time, no exceptions.",
     "There is a detail on almost every internal cill called the dog-ear — a small return at the end so the paint and the cill edge don’t meet in a horrible 90° corner that cracks on the first winter.\n\nOne small profile. It is on the drawing or it is not on the drawing. If it is not on the drawing, you will get a mitre.\n\nNobody has ever once wanted a mitre on a cill.",
     "Photorealistic macro photograph of the moulded dog-ear profile at the end of an internal painted timber cill, a paintbrush nearby, natural light emphasising the eased edge, shallow depth of field, craftsmanlike",
     "photo-real", "nerd")

post("ND-17", "nerd-detail", "static",
     "Fire and glazing. Nobody prices the hole.",
     "The average UK living room fireplace with an open fire is a permanent 0.1m² hole in the building envelope.\n\nNo window specification on earth fixes that. Every window company in the country has quoted windows into a room with a fire in it and every one of those quotes implied a warmer room.\n\nThe honest conversation costs you the job sometimes. Do it anyway.",
     "Photorealistic interior of a UK living room with a lit open fire in a brick chimney breast, a large new window beside it, warm firelight mixing with cool daylight from the window, moody and slightly melancholy, beautiful",
     "photo-real", "nerd", li_lead="Every window quote in Britain is subtly wrong if the room has a fireplace. Nobody in the trade is doing the thermal calc that accounts for the chimney. Here is the conversation that should be happening instead.")

post("ND-18", "nerd-detail", "static",
     "Sill, cill, and the spelling argument you are having with a client",
     "The trade says cill.\nThe dictionary says sill.\nThe building regs say neither consistently.\n\nNobody cares. The point is the word for the thing that sticks out at the bottom of a window, and I promise you every fitter will correct you on it regardless of how senior you are.",
     "Photorealistic close-up of a deep projecting window cill with a plant pot and a cup of tea sitting on it, a cat asleep, rain starting outside, warm interior light, cosy and ordinary",
     "photo-real", "nerd")

post("ND-19", "nerd-detail", "carousel",
     "Presets: the most useful thing in your quote and the least used",
     "A good preset is a window that is already right — a common size, a common spec, a known price, a known lead time, a known install time.\n\nIt turns a forty-minute quote into a ninety-second quote.\nIt turns “I’ll ring you back” into “done”.\nIt stops the office inventing a price at 6pm on a Friday.\n\nIf your most common window in your most common house is not a one-click preset, you are doing yourself harm.",
     "Photorealistic photograph of a laptop on a workshop bench showing a clean dark interface with a grid of preset window thumbnails, a mug of tea, a tape measure, window frame samples in the background, warm side light, modern and orderly",
     "screen-mock", "nerd", cta="Presets, frame viewer and live pricing. fenora.pro")

post("ND-20", "nerd-detail", "static",
     "Architrave or no architrave is a conservation area question",
     "No architrave is a cleaner modern detail.\n\nNo architrave is also: who is filling the gap between the frame and the plaster, and with what, and is that gap the same on all four sides, and is the plasterer coming back, and are they charging you for it.\n\n“Flush fit” is not a finish. It is a conversation between three trades.",
     "Photorealistic close-up of a window frame installed without architrave in a plastered UK wall, the shadow gap around the frame clearly visible, a paint brush and a sample of filler nearby, precise raking light, architectural detail",
     "photo-real", "nerd")

post("ND-21", "nerd-detail", "static",
     "Stainless grade. Say it out loud on the quote.",
     "Coastal job. Grade 304 looks fine on the quote, looks fine in the warehouse, looks spectacular for eighteen months and then rusts in a way that is genuinely personal.\n\n316 costs more. 316 does not rust. 316 is the difference between a guarantee and a phone call.\n\nSaying ‘316 throughout’ on the quote takes four seconds and saves you a return visit that will cost you four hours and one very unhappy customer.",
     "Photorealistic macro photograph of two stainless steel screws side by side on a dark surface, one showing early rust pitting, one pristine, a caliper and a paint chip indicating 304 and 316, clinical dramatic lighting, forensic",
     "photo-real", "nerd")

post("ND-22", "nerd-detail", "static",
     "Your U-value is only as good as the edge",
     "The middle of the glass is brilliant.\nThe edge of the frame is a thermal bridge with a marketing department.\n\nThe gap between the two is what the customer actually feels under their feet, and it is called the psi value, and it is the number that is missing from nine out of ten window quotes in this country.\n\nAsk for the whole frame. Not the glass. The whole frame.",
     "Photorealistic technical visualisation style photograph of a window frame cross-section with glowing heat-map colours showing warm loss at the frame edges and cool centre, dark background, scientific and clean, thermal simulation aesthetic",
     "screen-mock", "nerd", li_lead="Marketing U-values on glass is the most common window-quoting error there is. The customer feels the frame. The frame is the thermal bridge. Here is why the number on your quote is misleading.")

post("ND-23", "nerd-detail", "static",
     "Reveal depth: 300mm of wall doing nothing",
     "The window reveal is as important as the window and almost nobody designs it.\n\nA deep reveal shades the glass in summer, throws light onto the ceiling, gives the wall thickness, and makes a small room feel bigger.\n\nA flush reveal throws light straight at the back of your head from 6pm onwards in June and you will be redecorating the wall in September.",
     "Photorealistic architectural photograph of a deep window reveal in a thick UK stone wall, strong low sunlight bouncing onto the ceiling, deep shadow, sculpted light, minimalist interior, golden hour",
     "photo-real", "nerd")

post("ND-24", "nerd-detail", "static",
     "Hardware is 4% of the quote and 60% of the complaint",
     "Nobody complains about the glass.\n\nThey complain about the handle. The handle sticks. The handle is cold. The handle is the wrong shape for a pensioner’s hand. The lock doesn’t engage first time. The restrictor is set wrong. The friction stay sags.\n\nOne handle. £14. Every complaint you have ever read about a window that wasn’t the window.",
     "Photorealistic macro photograph of a polished chrome window handle being operated by a hand, catching the light, with a lock and a restrictor visible in the soft background, dark moody product photography, elegant and precise",
     "photo-real", "nerd", cta="Your ironmongery library. Your rates. Your handles. fenora.pro")

post("ND-25", "nerd-detail", "reel",
     "Named for a trade term, explained in 15 seconds",
     "Things I have had to explain to people outside this trade:\n\nMullion — the fat one.\nTransom — the wide one across the top.\nAstroglazing bar — the thin one on the inside.\nCill — the one at the bottom.\nPupil — a cow.\n\nThat last one is my favourite. There is a reason. Look it up.",
     "Photorealistic 9:16 shot of an annotated-style UK window with a hammer and a cow-themed pencil case on a workbench beneath it, playful energy, clean workshop background, soft daylight, quirky",
     "photo-trades", "nerd", img="9:16")

post("ND-26", "nerd-detail", "static",
     "The cut list exists. Use it. Actually use it.",
     "Every window company in Britain has a cutting list. It lives in a folder, or a clipboard, or in a man’s head, or in a WhatsApp group from 2019.\n\nIt is the single most valuable document in the business and it is the least protected.\n\nThe list is the product. The list must travel with the job. Everything else is logistics.",
     "Photorealistic photograph of a printed cutting list and a label being applied to a timber window frame in a UK workshop, sawdust in the air, clamps, a barcode scanner, hands at work, warm workshop lighting, focused and slightly dramatic",
     "photo-trades", "nerd", cta="The spec that priced the quote produces the purchase order, the cut list, the labels and the drawings. fenora.pro",
     li_lead="If your cutting list lives in a folder, your production system is a man with a clipboard. That is fine until he is on holiday.")

post("ND-27", "nerd-detail", "carousel",
     "Five things that turn a good install into a bad one",
     "1. The foam. Too little and it moves, too much and it bows the frame.\n2. The fixings. Into the reveal, into solid, never into the old frame.\n3. The gaps. If the perimeter gap is not consistent, the sealant tells the truth eventually.\n4. The sill. Level, with fall, horned, and cut to the wall not to the paper.\n5. The protection. If it isn’t taped, it will be marked. If it isn’t boarded, it will be scratched.\n\nFive things. That is the craft.",
     "Photorealistic detail photograph of a high-quality window installation junction: foam, fixing, gap and silicone line all visible and correct, a brush and clean tools nearby, macro detail, dark neutral background, craft",
     "photo-real", "nerd")

post("ND-28", "nerd-detail", "static",
     "The frame viewer made me realise how much glass we throw away",
     "I made a thing that shows how much of a window is actually glass, from every angle, with the sightlines drawn in.\n\nThen I looked at it for a very long time.\n\nOn a standard UK casement we are giving away 28% of the aperture to frame and bar. On a Georgian-barred box sash it is closer to 45%.\n\nOnce you see it you cannot unsee it. And you cannot unsee it in the customer’s sitting room either.",
     "Photorealistic screen photograph of a clean dark software interface showing a 3D window model with sightline dimensions overlaid and a glass-area percentage readout, floating at an angle on a neutral desk with a window sample in the background, crisp and modern",
     "screen-mock", "nerd", cta="Frame viewer and glass area, live. fenora.pro")

post("ND-29", "nerd-detail", "static",
     "Your lead time is a design decision",
     "“How long?”\n\nFour weeks. Because the glass was on special order and the powder coat took ten working days and the frame is Accoya at 15mm and we have a holiday in the middle.\n\nEvery one of those is a choice somebody made months ago, usually somebody who was not in that conversation and is not going to be in the follow-up phone call either.\n\nLead time is not a quote line. It is a promise made by a factory to a customer who will remember it exactly.",
     "Photorealistic photograph of a long row of framed window units laid out in a UK factory finishing area awaiting collection, numbered chalk marks, industrial floor, shafts of light from high windows, sense of quiet commitment",
     "photo-trades", "nerd")

post("ND-30", "nerd-detail", "static",
     "Foil or solid colour. The decision people get wrong.",
     "Woodgrain foil looks fantastic for eleven years.\n\nThen it lifts at a corner, or it fades in a south-facing bay, or somebody puts their kettle on the cill and it bubbles, and the window you specified is now a window you apologise for.\n\nSolid colour is a different product with a different lead time and it is the only honest answer to a south-facing bay on a south-facing house.",
     "Photorealistic close-up photograph of a window cill in a south-facing bay, a hot kettle sitting on a lifted corner of woodgrain foil, sunlight glaring, the lifting edge catching the light, slightly tragic, macro detail",
     "photo-real", "nerd")
