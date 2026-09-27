# -*- coding: utf-8 -*-
"""
Fenora Pro content library — Part D
High-volume shareable formats, POVs, polls, myth-busting, seasonal, engagement bait
"""
from posts_a import post

# ═══════════════════════════════════════════════════════════════════
# ONE-LINER WALL — high share rate, low effort, runs for months
# ═══════════════════════════════════════════════════════════════════

OL = [
    ("“It’s an easy fit.”", "Said by someone who has never seen a reveal.", "photo-trades", "pain"),
    ("The drawing is always wrong. The survey is always right. The job is always fine.", "Somebody has to check. It is becoming a theme.", "photo-real", "pain"),
    ("“We’ll sort it out on site.”", "The sentence with no owner, no cost and no definition of done.", "photo-real", "contrarian"),
    ("Sill, cill, whatever you like. It is the thing at the bottom of the window.", "This argument will outlive us all.", "photo-real", "nerd"),
    ("Twelve years of trouble-free sashes. Then the cords give on a Tuesday.", "They were always going to. You just bought the time.", "photo-real", "nerd"),
    ("A 4mm difference is a 20 minute job or a 4 hour job.", "Which one it is depends entirely on the day.", "photo-real", "nerd"),
    ("“Is it a scratch or a crack?” is not a question, it is a whole philosophy.", "The answer is usually reflection.", "photo-real", "pain"),
    ("Ninety per cent of window complaints are about the handle.", "Ninety per cent of window margin is also decided before the handle.", "photo-real", "nerd"),
    ("The fastest way to lose a job is to be unavailable on the Tuesday.", "Speed is not cutting corners. Speed is not retyping.", "photo-trades", "contrarian"),
    ("Every house has one window above a downpipe.", "Always the ugliest elevation. Always the most quoted.", "photo-real", "nerd"),
    ("“My brother-in-law did it in a day.”", "The brother-in-law did not shim, scribe, foam or seal.", "photo-trades", "pain"),
    ("You can get a window flush with the frame. You cannot get it flush with the plaster.", "Three trades. One gap. Everyone’s problem.", "photo-real", "nerd"),
    ("The cheapest quote is the job missing its most expensive part.", "It is on page four. Page four comes after page one.", "photo-real", "contrarian"),
    ("Old frames come out and for nine seconds, the job is easy.", "Then you meet the lintel.", "photo-real", "pain"),
    ("“Just while you’re here.”", "Six words. No scope. No price. No survivors.", "photo-trades", "pain"),
    ("Planning applications: replace uPVC with uPVC.", "It is still a job. Somebody has to make them.", "photo-real", "planning"),
    ("The reveal said 70. The reveal measured 52.", "The reveal did not lie. The drawing did.", "photo-real", "nerd"),
    ("Nobody asks where the water goes.", "The customer will, in February.", "photo-real", "nerd"),
    ("There is always a dog. There is always a moment.", "You cannot move a Labrador. Everyone has tried.", "photo-trades", "pain"),
    ("28% of a standard UK casement is not glass.", "Now you cannot unsee it in the customer’s lounge.", "photo-real", "nerd"),
    ("“Is VAT extra?”", "It is always extra. It is never, ever extra.", "photo-real", "customers"),
    ("A keystone is two seconds of work and the whole job.", "If you check it.", "photo-real", "nerd"),
    ("A remake costs more than a year of software.", "And it almost always starts with two systems.", "photo-real", "contrarian"),
    ("“We’ve been waiting three weeks.”", "The polite version. There is an unpolite version.", "photo-real", "customers"),
    ("The first two days of any fit are the reveal. The last two are the snags.", "Nobody ever talks about the last two days.", "photo-trades", "pain"),
    ("316 stainless. Say it on the quote. Saves a return visit.", "Four seconds of typing. Four hours of not going back.", "photo-real", "nerd"),
    ("The customer who says ‘I’ll think about it’ is going to buy this week.", "From whoever replies on Thursday.", "photo-real", "customers"),
    ("The workman is not the problem. The reveal is never the problem.", "The problem is 400mm above your head, hidden, and from 1994.", "photo-real", "pain"),
    ("Turnover is a vanity metric. Margin held is not.", "Four numbers, one record, zero invention.", "screen-mock", "money"),
    ("“It’ll be fine.”", "In the rare occasion it is not, it is the most expensive sentence in construction.", "photo-real", "contrarian"),
    ("Specification is ten facts. Nine of them are on the quote already.", "The tenth one is the one that saves you.", "photo-real", "wip"),
    ("Nobody ever wanted a mitre on a cill.", "Dog ear it. It is on the drawing or it is not.", "photo-real", "nerd"),
    ("The neighbour had the same job done and it was fine.", "The neighbour did not have 1938 walls.", "photo-real", "customers"),
    ("A 45° bay loses 30% of its glass.", "A 90° box gives you a pier in your living room.", "photo-real", "nerd"),
    ("“Just tell me what you’d do.”", "Best customer in the world. Charge them properly and mean it.", "photo-real", "customers"),
    ("Every single load has a weight, a length and a condition.", "And every single one has been booked without them.", "photo-trades", "wip"),
    ("Fitting is not a percentage. It is a programme.", "40 minutes or eleven hours. Price it accordingly.", "photo-trades", "contrarian"),
    ("“Can you take it off the invoice if you sort that?”", "Yes. As usual. As always.", "photo-real", "pain"),
    ("The last two jobs in your diary are the most dangerous ones.", "The one you can’t do properly and the one you can’t say no to.", "photo-trades", "pain"),
    ("A colour is not a colour. It is a light and a wall and a time of day.", "Open the book in the kitchen. Not the showroom.", "photo-real", "customers"),
    ("If you cannot say what the job made you, you are guessing.", "And you have been guessing for years.", "photo-real", "money"),
    ("The trimmer. The arch. The eyebrow. The devil's own detail.", "Four ways to make an architect cry.", "photo-real", "nerd"),
    ("“Can you just do one for now?”", "The most expensive sentence in domestic construction.", "photo-real", "customers"),
    ("A survey is not a tape measure. It is an investigation.", "And it is the only part of the job nobody wants to pay for.", "photo-trades", "contrarian"),
    ("The cavity has been packed with foam since 1994.", "Every house. Every house. Every single house.", "photo-real", "nerd"),
    ("The hardest window to fit is in the easiest room.", "It is always the one above the bath.", "photo-real", "pain"),
    ("“I saw your van.”", "Best four pence you will ever spend.", "photo-trades", "customers"),
    ("One job, typed six times, each slightly different.", "Somebody is the person in the middle. You know who.", "photo-real", "contrarian"),
    ("Fit a window you are proud of, not a window you can blame.", "The customer will be there for it for twenty years.", "photo-trades", "contrarian"),
    ("You are not selling a window. You are selling the room it is in.", "Nobody ever remembers a window. They remember a warm lounge.", "photo-real", "contrarian"),
]

for i, (hook, body, style, pillar) in enumerate(OL, start=1):
    # A different visual prompt per item so the library never looks repetitive.
    visual = {
        "pain": "Photorealistic candid British trades scene that illustrates the frustration, hi-vis and real materials, overcast daylight, documentary realism",
        "nerd": "Photorealistic extreme detail of a window detail, shallow depth of field, precise and beautiful, neutral daylight",
        "contrarian": "Photorealistic conceptual scene with a slightly awkward, thought-provoking composition, British domestic, muted palette",
        "customers": "Photorealistic candid British domestic scene, a customer mid-conversation or gesturing, natural warm interior light",
        "planning": "Photorealistic British residential streetscape or a doorstep with paperwork, sober and dry, overcast light",
        "money": "Photorealistic still life of business paperwork, tools and a calculator on a workbench, moody side light",
        "wip": "Photorealistic workshop or site detail showing precision and process, warm industrial light, documentary",
        "trades": "Photorealistic candid British trades scene, hi-vis, van, tools, overcast daylight",
    }[pillar]
    post(f"OL-{i:02d}", pillar, "static", hook, body,
         f"{visual}. The image should suggest: {hook.lower()} No text, no logos, no watermarks.",
         style, "oneliners")


# ═══════════════════════════════════════════════════════════════════
# POV / SHORT REEL FORMATS
# ═══════════════════════════════════════════════════════════════════

post("PV-01", "trade-pain", "reel",
     "POV: you’ve said “nearly done” twice",
     "POV: you have said “nearly done” twice.\n\nIt is a normal phrase. It means a useful amount of time remains.\n\nSomewhere in a kitchen, a person is saying “they said nearly done, so I’ll put the plates out.”",
     "Photorealistic 9:16 shot of a tradesperson wiping their forehead, tools in hand, a partly completed window behind, hard afternoon light, long shadows, the exhaustion of a nearly-done day, cinematic",
     "photo-trades", "pain", img="9:16")

post("PV-02", "customer-reality", "reel",
     "POV: the customer asks to see the drawing",
     "POV: the customer asks to see the drawing.\n\nNinety per cent of quotes do not have one.\n\nThe ones that do get signed, get referred, and get paid. The ones that do not get a fortnight of “we’re just thinking about it” and then a phone call from someone else.",
     "Photorealistic 9:16 shot from behind a tradesperson holding a tablet showing a technical window drawing, presenting it to a customer, both in a domestic hallway, soft window light, warm and competent, portrait framing",
     "photo-trades", "customers", img="9:16", cta="The drawing on the quote. fenora.pro")

post("PV-03", "trade-pain", "reel",
     "POV: the dog decides it’s their job",
     "POV: you are forty minutes into a fit. The dog has decided this is now their job.\n\nThe dog is friendly. The dog is in the exact spot you need for the next forty minutes.\n\nYou have moved that dog. Everyone has moved that dog. It returns. It is a law of physics.",
     "Photorealistic 9:16 shot of a friendly golden retriever sitting in the exact centre of a work area surrounded by window frames and tools, a tradesperson's legs visible at the edge of frame, comedy, warm indoor light, portrait framing",
     "photo-trades", "pain", img="9:16")

post("PV-04", "trade-pain", "reel",
     "POV: the reveal is not square",
     "POV: you put the spirit level on the cill and the bubble looks at you.\n\nNot a long bubble. Not a near-miss. The bubble looks at you like it has opinions.",
     "Photorealistic 9:16 extreme close-up of a spirit level on a window cill with the bubble pressed hard to one end, a worker's hand resting on the level, cold grey daylight, comedic dread, portrait framing",
     "photo-real", "nerd", img="9:16")

post("PV-05", "wip", "reel",
     "POV: you’re the person who found the job on the planning portal",
     "POV: you are the one who was reading the planning portal at 10pm on a Sunday for absolutely no reason.\n\nYou see a single-storey rear extension. Nine casements. A client who has gone quiet. The glass is a nine-day lead time.\n\nAnd nobody else in the country knows about this yet.",
     "Photorealistic 9:16 shot of someone at a kitchen table late at night, laptop glow, a mug, a notepad, a phone, moody dark room, the specific loneliness of a good idea found alone, cinematic",
     "screen-mock", "planning", img="9:16", cta="Do that automatically. fenora.pro/job-finder")

post("PV-06", "trade-pain", "reel",
     "POV: the customer is narrating",
     "POV: the customer is narrating.\n\nNot helping. Narrating. From a chair. With a full understanding of what you are doing and a different understanding of how you are doing it.\n\n“Ooh — that’s clever, that.” Every forty seconds. For three hours.",
     "Photorealistic 9:16 shot of a customer sitting in an armchair mid-room with a cup of tea, gesturing enthusiastically while a tradesperson works in the background, warm lamp light, comedic, portrait framing",
     "photo-trades", "pain", img="9:16")

post("PV-07", "wip", "reel",
     "POV: the whole job on one screen while you’re on site",
     "POV: you are stood in a customer’s hallway with no signal, and you can see the whole job anyway.\n\nThe quote. The drawing. The spec. The variation you flagged yesterday. The delivery date. The balance outstanding.\n\nAll of it. On the phone. Working offline.",
     "Photorealistic 9:16 shot of a surveyor standing in a dim hallway holding a phone, screen lighting their face, an offline progress indicator implied, moody and capable, portrait framing",
     "screen-mock", "wip", img="9:16", cta="Works with no signal. fenora.pro")

post("PV-08", "money", "reel",
     "POV: the invoice goes out on the same day the job signs",
     "POV: the customer signs at the door. The invoice is already built. The variation is already priced. The drawings are already attached. The delivery note is already queued.\n\nThe office does not have to do anything. The job just… closes.",
     "Photorealistic 9:16 shot of a customer signing a phone at their front door, sunlight behind them, a tradesperson holding the door open, a new window visible in the hall, warm and optimistic, portrait framing",
     "photo-trades", "money", img="9:16", cta="Signed on the doorstep, invoiced on the spot. fenora.pro")


# ═══════════════════════════════════════════════════════════════════
# MYTH BUSTING / HOT TAKE CAROUSELS
# ═══════════════════════════════════════════════════════════════════

post("MY-01", "contrarian", "carousel",
     "Five things a window company believes that are not true",
     "Slide 1: “A bigger sample wins the job.” Nobody buys a 300mm timber sample. They buy trust, speed and a drawing.\n\nSlide 2: “Cheaper fittings save money.” It costs you a return visit and the job.\n\nSlide 3: “We don’t need a system, we’re only ten people.” Ten people is exactly when a system pays for itself.\n\nSlide 4: “The office can just remember it.” Offices do not remember. They remember until they are on holiday.\n\nSlide 5: “We’ll never be big enough to need this.” This is the reason the big ten are as good as they are.",
     "Photorealistic conceptual photograph of five ordinary workshop objects arranged in a row on a dark surface — a timber sample, a cheap handle, a spiral notebook, a memory, a small factory gate — minimal, moody, editorial still life",
     "photo-real", "contrarian", cta="fenora.pro")

post("MY-02", "nerd", "carousel",
     "Myth: bigger glass means a better window",
     "Slide 1: “You can have more glass.” Yes. You can also have a weaker frame, a bigger sightline problem and a heavier unit.\n\nSlide 2: Glass area is set by the frame, the bar and the structural requirement — not by ambition.\n\nSlide 3: A 2,180mm frame in a 1,900mm opening is not slim sightlines. It is a structural claim.\n\nSlide 4: The right question is not “how much glass”. It is “how much glass, in what frame, at what sightline, at what weight”.\n\nSlide 5: That is a specification conversation. Not a brochure.",
     "Photorealistic technical photograph comparing a wide heavily-barred window beside a slim lightly-barred one, the sightline widths clearly visible, a tape measure spanning both, dark neutral background, analytical and clean",
     "screen-mock", "nerd")

post("MY-03", "contrarian", "carousel",
     "Myth: a survey is a tape measure",
     "Slide 1: The tape tells you the size.\n\nSlide 2: It does not tell you whether the wall is structural.\n\nSlide 3: It does not tell you what the cavity contains.\n\nSlide 4: It does not tell you whether the lintel is original, or whether the render is sound, or whether the floor is in the way, or where the drain is.\n\nSlide 5: It does not tell you what the job is worth.\n\nSlide 6: A number without a survey is a guess with a decimal point.",
     "Photorealistic still life of a survey toolkit arranged neatly — tape measure, laser measure, probe, torch, camera, notebook, moisture meter — on a dark bench, overhead dramatic light, forensic and professional",
     "photo-real", "contrarian", cta="Surveying, in full. fenora.pro")

post("MY-04", "contrarian", "carousel",
     "Myth: the cheapest quote wins the job, so quote low",
     "Slide 1: You quoted low. You won it. You are now three weeks in and you have lost money on it.\n\nSlide 2: You can win the job and still be wrong about it. These are separate events.\n\nSlide 3: The dangerous quote is not the one that loses. It is the one that wins.\n\nSlide 4: A business that prices to win is a business that manufactures loss.\n\nSlide 5: Price the job. Not the competitor. Then win it honestly.",
     "Photorealistic conceptual photograph of a low printed quote on a desk beside a much higher one, a hand turning the second one over, dramatic side lighting, a sense of a decision being made, editorial still life",
     "photo-real", "contrarian", li_lead="The most dangerous quote in any business is the one that wins.")

post("MY-05", "nerd", "carousel",
     "Myth: all double glazing is the same glass",
     "Slide 1: There is a 2mm difference in cavity width, which is a 12% difference in energy loss.\n\nSlide 2: There is argon and there is air, and it is about 15% of the U-value.\n\nSlide 3: There is warm edge and there is aluminium, and it matters at the perimeter, which is where the loss actually is.\n\nSlide 4: There is a coated face and there is a clear face, and it has to go the right way up or it is worse than nothing.\n\nSlide 5: There is no such thing as a standard sealed unit. Ask for the make-up in millimetres and watch what happens.",
     "Photorealistic extreme macro photograph of a cutaway sealed glass unit edge showing the warm edge spacer and argon cavity, precision laboratory lighting, beautiful and technical, dark background",
     "photo-real", "nerd")


# ═══════════════════════════════════════════════════════════════════
# POLLS / QUIZZES / STORY
# ═══════════════════════════════════════════════════════════════════

post("PO-01", "customer-reality", "poll",
     "It’s an easy fit. How long?",
     "Honest answer, nobody is being fired:",
     "Photorealistic wide interior of a very complicated UK property renovation — bay, bay return, tall windows, a soffit, a conservatory — a single tradesperson standing at the far end looking at it, comedic scale, overcast light",
     "photo-trades", "customers", platforms="IG")

post("PO-02", "trade-pain", "poll",
     "The worst thing a customer can say on site",
     "Be honest. I will not name names. I will think about them though.",
     "Photorealistic candid shot of a tradesperson's face in profile reacting to something off camera, tools in foreground out of focus, exaggerated deadpan expression, warm light, comedy",
     "photo-trades", "pain", platforms="IG")

post("PO-03", "nerd", "quiz",
     "What is this window part called?",
     "Ten thousand window fitters will get this instantly.\n\nThe other ninety thousand will guess. Guess confidently. And be wrong in a way that would have cost them a job.",
     "Photorealistic macro photograph of an unfamiliar architectural window detail, a soft-edged rectangle at the top of a frame, dramatic raking light, a quiz-style mystery object, dark background, precise",
     "photo-real", "nerd", platforms="IG")

post("PO-04", "money", "poll",
     "Where does the margin actually go?",
     "Four places. Pick the one that costs you most.",
     "Photorealistic conceptual photograph of money represented as small scattered coins on a dark workshop bench among tools, dramatic lighting, abstract and moody, editorial still life",
     "photo-real", "money", platforms="IG")

post("PO-05", "trade-pain", "poll",
     "The wall. Straight or not straight?",
     "Every single fitter has a number. Type yours in the comments. I will start.",
     "Photorealistic extreme close-up of a rough brick wall with a spirit level laid against it, the bubble clearly not centred, a steel rule in shot, unforgiving flat light, forensic",
     "photo-real", "pain", platforms="IG")

post("PO-06", "planning", "poll",
     "The most realistic planning description",
     "A. “Alterations to the front elevation comprising replacement fenestration.”\nB. “Replacement of uPVC windows with uPVC windows.”\nC. “The windows have gone a bit yellow.”\nD. All of the above, in one application.",
     "Photorealistic flat lay of three official-looking planning documents and one handwritten note, a pair of reading glasses, a highlighter, desk lamp, dry and comic, overhead warm light",
     "photo-real", "planning", platforms="IG")

post("ST-01", "wip", "story",
     "6am. First van out.",
     "Story only. No caption. Just the shot.\n\nAsk the story poll at the end: ‘what’s the first job?’",
     "Photorealistic vertical 9:16 photograph of a work van at a trade yard at dawn, headlights on, mist, loading door open, condensation on the glass, blue hour light, atmospheric and cinematic, no people",
     "photo-trades", "wip", platforms="IG", img="9:16")

post("ST-02", "trade-pain", "story",
     "The reveal, before.",
     "Story. Photo of the opening, no caption.\n\nSticker poll: ‘square or not square’",
     "Photorealistic vertical 9:16 photograph of an empty, unprepared UK window opening before any fitting, raw brick, old plaster, damp evidence, a spirit level and tape left leaning against the wall, morning light pouring in, atmospheric",
     "photo-real", "pain", platforms="IG", img="9:16")

post("ST-03", "planning", "story",
     "A planning approval landed last night.",
     "Story only.\n\nLink sticker to the job finder.",
     "Photorealistic vertical 9:16 phone-in-hand shot at 10pm showing a planning approval notification, a laptop blurred behind, dark room, single warm lamp, the thrill of a quiet win, cinematic",
     "screen-mock", "planning", platforms="IG", img="9:16", cta="Find yours. fenora.pro/job-finder")

post("ST-04", "team", "story",
     "The office at 5pm.",
     "Story. No caption.\n\nSticker: poll ‘should we still be here?’ — obviously yes.",
     "Photorealistic vertical 9:16 photograph of a small trade office at dusk with one person still working, a monitor showing a quote, a window sample, warm lamp light against a blue window, atmospheric",
     "photo-real", "team", platforms="IG", img="9:16")


# ═══════════════════════════════════════════════════════════════════
# SEASONAL / TIMELY
# ═══════════════════════════════════════════════════════════════════

post("SS-01", "trade-pain", "static",
     "Winter. Which means it is a reveals-and-architraves season.",
     "October to February is not a quiet season. It is a weird season.\n\nNobody can see the opening. Nobody can see the brickwork. Nobody wants an open room. Everybody is cold, in a hurry, and asking for the work to be done before Christmas, which means it will be done after Christmas.",
     "Photorealistic photograph of a UK semi-detached house in winter, snow or frost, windows lit from inside, scaffolding up, a fitter's van parked, bare trees, blue hour, cold and quiet, documentary",
     "photo-real", "pain", series="winter")

post("SS-02", "customer-reality", "static",
     "The January resolution: draughts, not windows",
     "Every January, a quarter of the country decides the solution to a cold room is a £40 roll of brush sealer off the internet.\n\nSometimes that is exactly right and I am happy for them.\n\nMore often the problem is the cavity, the fireplace, the floor and the 1974 extension, and the roll of sealer is going to cost them the price of a door and give them back four months.",
     "Photorealistic interior of a UK living room in winter with a lit fire, condensation on a cold window, a half-used roll of draught excluder on the cill, cosy but subtly hopeless, warm interior against cold blue window light",
     "photo-real", "customers", series="winter")

post("SS-03", "trade-pain", "static",
     "Wet week. The trade does not stop.",
     "The trade does not stop in the wet.\n\nThe trade stops when it is unsafe, when the glass will not go in safely, or when the customer has decided that nobody should be having a bad day on their account.\n\nThat is three days a year, optimistically, and about a fortnight if you include weekends.",
     "Photorealistic photograph of tradespeople in waterproofs carrying a window frame through heavy rain on a wet UK street, splash on the pavement, hi-vis saturated, dramatic grey light, determination, documentary",
     "photo-trades", "pain", series="winter")

post("SS-04", "planning", "static",
     "Spring. This is when the applications land.",
     "Spring is when the planning applications arrive.\n\nWinter is for research. Spring is for validation. Summer is for the scaffold going up and the whole street finding out at once.\n\nThe jobs that get quoted in April are the jobs that get installed in July, and the ones that get installed in July are the ones whose survey you did in April, properly, with a drawing.",
     "Photorealistic aerial photograph of a UK residential street in spring with blossom, scaffolding rising on several houses, a skip, trades vans, bright green trees, fresh and busy, documentary",
     "photo-real", "planning", series="spring")

post("SS-05", "money", "static",
     "Year end. The accounts do not fix themselves.",
     "Year end is when everybody discovers the same thing at the same time.\n\nThe job that was quoted at forty per cent. The variation nobody invoiced. The retention nobody chased. The customer who paid in March. The skip hire in November that was still on an account that was closed.\n\nNone of this is a bookkeeping problem. It is a records problem, and it was a records problem in March.",
     "Photorealistic photograph of an accountant's desk at year end: stacks of invoices, a calculator, a ledger, a cold coffee, a laptop, low evening light, a sense of dread and accumulation, muted, documentary",
     "photo-real", "money", series="winter")


# ═══════════════════════════════════════════════════════════════════
# LINKEDIN-FIRST LONG FORM
# ═══════════════════════════════════════════════════════════════════

post("LL-01", "contrarian", "text",
     "The window industry has a data problem, not a sales problem",
     "Nobody in UK window manufacturing is short of work.\n\nWhat they are short of is certainty. Certainty about what was quoted. What was surveyed. What was ordered. What was made. What was delivered. What was paid.\n\nSix organisations, six systems, and one person — usually the most overloaded person in the company — responsible for the integrity of the whole chain.\n\nThe remake rate in this industry is a direct, measurable function of how many systems a job passes through. It is not a quality problem. Quality is the best part of this trade. It is a reconciliation problem.\n\nThe fix is not better salespeople or better ads. It is one record that carries the specification, the price, the evidence and the history from enquiry to final invoice, written once and read everywhere.\n\nIt is not glamorous. It is the whole thing.",
     "Clean abstract architectural photograph: a single continuous line of light running through a dark industrial space, one beam, unbroken, minimal, high contrast, editorial, no text",
     "photo-real", "contrarian", platforms="LI,IG,FB",
     li_lead="The window industry does not have a sales problem. It has a reconciliation problem.",
     cta="One record for the whole job. fenora.pro")

post("LL-02", "wip", "text",
     "We built a job finder because nobody else bothered",
     "There is a public register of every planning application in the United Kingdom. It is free. It is searchable. It contains, in plain English, what people are applying to build on specific addresses.\n\nRoughly one in six of those applications includes window or door work worth quoting.\n\nAlmost nobody is using it. The reason is not a lack of access — it is that turning a PDF into a lead, and a lead into a survey, and a survey into a quote requires a person with a highlighter and a lot of free time.\n\nWe built it into the platform instead. Search by radius, by application type, by date. Flag conservation area, Article 4 and listed status. Estimate units and likely specification. Add it to the pipeline as a real record with the address and the works attached.\n\nThe interesting part is not the search. It is that the job arrives in the system already connected to surveying, configuring, quoting and delivery, so nobody has to rebuild it in six other tools.\n\nIf you install windows, this is a free, permanent, uncrowded pipeline in your own area. It has been sitting there the entire time.",
     "Clean conceptual photograph of a satellite-style map glowing on a dark screen with location pins, abstract, minimal, high contrast, no legible text, editorial technology photography",
     "screen-mock", "planning", platforms="LI,IG,FB",
     li_lead="There is a free, public, permanent pipeline of window work sitting in your area, and almost nobody is using it.",
     cta="Planning job finder. fenora.pro/job-finder")

post("LL-03", "build-in-public", "text",
     "Why we will not publish a customer testimonial",
     "We could have a wall of them tomorrow. That was available to us on day one.\n\nThe reason we have not is that every customer we have is a window business, and a window business that publishes its own margin, its own remake rate and its own quoting failures to a software vendor's website has taken a risk it did not need to take.\n\nSo we will not ask.\n\nWhat we will publish instead is four measures: time to quote, remakes, margin held against margin quoted, and re-entries per job. Real businesses, real figures, agreed in writing before anything goes on the site.\n\nWe have none of those published yet. Not because we do not track them, but because we do not have permission from the right number of people.\n\nThat is a slower way to build trust. It is also the only way that survives a reference call.",
     "Clean minimal photograph of an empty presentation board or blank wall in a workshop, single shaft of light, nothing on it, honest, muted, no text, no logos, editorial",
     "photo-real", "build", platforms="LI,IG,FB",
     li_lead="Every SaaS company has customer testimonials available on day one. Here is why we have not used one.",
     cta="The four measures we hold ourselves to. fenora.pro")

post("LL-04", "money", "text",
     "Window businesses do not lose money in the factory",
     "They lose it in four places that almost nobody writes down.\n\nOne: the survey. An opening comes in 9mm out, it becomes a wedge, a second visit and a morning, and it is absorbed because the quote was a lump sum with a fitting percentage buried inside it.\n\nTwo: the office. The specification is re-keyed between systems, and once it is re-keyed it belongs to whoever keyed it last.\n\nThree: the second visit. “Just while you're here” has no scope, no price and no owner, and it is the single most expensive sentence in domestic construction.\n\nFour: delivery. A 2,180mm frame on an unsuitable vehicle becomes two vans, and two vans are rarely in anybody's model.\n\nNone of this is a manufacturing problem. The manufacturing in this industry is genuinely world class.\n\nIt is a data problem, and data problems are cheap to fix and expensive to ignore.",
     "Clean conceptual photograph of a single candle-lit workspace in a large dark industrial hall, one desk, everything else in shadow, minimal, high contrast, editorial, no text",
     "photo-real", "money", platforms="LI,IG,FB",
     li_lead="The best manufacturing in the industry, undone by four data problems that cost less to fix than a single remake.",
     cta="Price the fitting. Carry the variation. fenora.pro")

post("LL-05", "contrarian", "text",
     "The spreadsheet is not a cheap version of quoting software",
     "It is a shared, mutable document with no version history, no permissions, no validation and no relationship to anything else in the business.\n\nEvery modification overwrites the last. Two people cannot work in it at once. Nothing enforces that a width is a number. Nothing knows that opening W0.2 belongs to a survey that belongs to a job that belongs to a customer.\n\nAnd the cell that somebody changed last Thursday — the one that moves a casement from 1200 to 1186 — has no record of who changed it, when, or why, and by the time anybody notices, the frame is on a van.\n\nA spreadsheet is a genuinely useful tool. It is a terrible system of record.\n\nThe distinction matters because most small businesses have quietly decided that the spreadsheet is the system. It is not the system. It is the place the data goes to get lost.",
     "Clean conceptual still life: a crumpled printed spreadsheet on a dark desk with a pen resting on one altered cell, a magnifying glass, a single hard light source, moody, editorial, no legible text",
     "photo-real", "contrarian", platforms="LI,IG,FB",
     li_lead="A spreadsheet is not a cheap version of quoting software. It is a system of record with none of the guarantees of one.",
     cta="No spreadsheets. One record. fenora.pro")
