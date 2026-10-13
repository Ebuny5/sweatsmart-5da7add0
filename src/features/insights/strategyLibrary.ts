/**
 * strategyLibrary.ts
 * All HidroAlly insight content. Edit TEXT here, never in insightEngine.ts.
 * Rules: plain language; medical terms go in GLOSSARY (auto-bracketed) or are
 * bracketed by hand; relief says WHERE / HOW / HOW LONG; name body parts
 * (face, palms, feet, underarms, back, chest, groin, thighs, neck, scalp)
 * so the engine knows which areas a strategy suits.
 */
export interface TriggerDef {
  id: string; label: string; phase: number;
  kind: "thermal" | "emotional" | "physical" | "systemic" | "none";
  zones: string[]; why: string; relief: string[]; lifestyle: string[]; flag: string | null;
}
export const TRIGGERS: TriggerDef[] = [
  {
    "id": "hot_temp",
    "label": "Hot Temp",
    "phase": 1,
    "kind": "thermal",
    "zones": [
      "head_neck",
      "torso",
      "underarms"
    ],
    "why": "Hot air raises your core temperature, so your body switches on its normal cooling system. The eccrine sweat glands release sweat, mostly across the face, scalp, back, chest and underarms.",
    "relief": [
      "Wrap an ice pack or cold damp cloth in a thin towel and hold it on your wrists or the sides of your neck for 1 to 2 minutes. These are pulse points, so you cool the blood as it circulates.",
      "Point a small handheld fan at your face and chest from about an arm's length away and keep it on until the damp feeling fades.",
      "Lightly mist bare skin with cool water, then sit near a fan or air conditioner. As the water dries it pulls heat off your skin.",
      "Go into air conditioning or deep shade (under a tree or awning) at the first sign of heat and stay at least 5 minutes."
    ],
    "lifestyle": [
      "Wear loose, breathable fabrics such as linen or 100% cotton, and keep outdoor plans away from the hottest hours (11 AM to 4 PM) where you can.",
      "Pre-cool before heat: rinse your face and wrists under cool water and drink a cold glass of water 15 minutes before heading out."
    ],
    "flag": null
  },
  {
    "id": "high_humidity",
    "label": "High Humidity",
    "phase": 1,
    "kind": "thermal",
    "zones": [
      "underarms",
      "groin_thighs",
      "feet",
      "torso"
    ],
    "why": "When the air is already full of moisture, sweat cannot evaporate off your skin. It just sits there and builds up, especially in skin folds like the underarms, groin, thighs and feet.",
    "relief": [
      "Blot damp skin gently with a microfibre towel or a dab of cornstarch-based powder. Press and lift, because rubbing irritates wet skin.",
      "Stand in front of an air conditioner vent or switch on a dehumidifier for a few minutes so your sweat can finally evaporate.",
      "Change into a dry inner shirt, and dry socks if your feet are damp, as soon as yours feel wet. Keep a spare set in your bag.",
      "Dust absorbent powder or apply antiperspirant to skin folds that rub together, such as the groin, inner thighs and underarms, to cut moisture and friction."
    ],
    "lifestyle": [
      "Wear moisture-wicking base layers (athletic fabrics that pull sweat away from your skin) on humid days. Cotton stays wet once soaked.",
      "Plan errands for early morning, when humidity is usually lowest, and carry a small towel and spare socks so one flare-up doesn't leave you damp all day."
    ],
    "flag": null
  },
  {
    "id": "temp_shift",
    "label": "Temp Shift",
    "phase": 1,
    "kind": "thermal",
    "zones": [
      "head_neck",
      "torso"
    ],
    "why": "Moving between hot outdoors and cold air conditioning (or the reverse) shocks your autonomic nervous system. Your blood vessels narrow or widen suddenly, and sweat can spike across the face, head and back.",
    "relief": [
      "Take off or put on a layer BEFORE you walk into the new temperature, not after.",
      "Sip room-temperature water instead of ice-cold water so your inner temperature settles gently.",
      "Pause 1 to 2 minutes in a hallway or in shade before moving between very hot and very cold places.",
      "Take 5 slow belly breaths: in through your nose for 4 seconds, out through your mouth for 6. This calms the body's reaction to the shock."
    ],
    "lifestyle": [
      "Dress in layers, such as a light cardigan or jacket, so you can adapt in seconds when you move between indoors and outdoors.",
      "When you know you're going from heat into strong air conditioning, step in gradually: stand near the entrance for a minute before moving to a cold seat."
    ],
    "flag": null
  },
  {
    "id": "sun_exposure",
    "label": "Sun Exposure",
    "phase": 1,
    "kind": "thermal",
    "zones": [
      "head_neck",
      "torso"
    ],
    "why": "Direct sun heats your scalp, face and back quickly, and your body answers with heavy head and face sweating.",
    "relief": [
      "Step into deep shade or go indoors straight away.",
      "Mist your face with cold water (thermal spring water or cold distilled water works well) and let it air dry.",
      "Take off tight hats or headwear for a few minutes so heat can leave your scalp.",
      "Lay a cool wet cloth across the back of your neck and forehead for 1 to 2 minutes."
    ],
    "lifestyle": [
      "Wear a wide-brimmed, ventilated hat and a light mineral sunscreen labelled non-comedogenic (it won't clog your pores), so you are protected without trapping heat.",
      "Plan outdoor time before 11 AM or after 4 PM, and carry a small cold water bottle to press on your neck when the sun is strong."
    ],
    "flag": null
  },
  {
    "id": "synthetic_fabrics",
    "label": "Synthetic Fabrics",
    "phase": 1,
    "kind": "thermal",
    "zones": [
      "underarms",
      "torso",
      "groin_thighs"
    ],
    "why": "Fabrics like polyester, nylon and rayon trap heat and moisture against your skin, creating a mini greenhouse under the arms, on your back and chest, and in the groin.",
    "relief": [
      "Loosen, unbutton or remove synthetic outer layers right away.",
      "Slip a clean paper towel or tissue liner between your skin and the fabric to soak up moisture until you can change.",
      "Aim a hair dryer on its COOL setting inside your clothing for a short time to push out trapped heat.",
      "If the fabric rubs and the skin burns, apply an anti-chafing balm to your inner thighs or underarms."
    ],
    "lifestyle": [
      "Swap synthetic shirts and underwear for 100% cotton, bamboo or linen, starting with the pieces that touch your problem areas.",
      "When shopping, check the label: choose breathable, loose weaves and avoid tight non-stretch synthetics for long days."
    ],
    "flag": null
  },
  {
    "id": "poor_airflow_no_ventilation",
    "label": "Poor Airflow / No Ventilation",
    "phase": 1,
    "kind": "thermal",
    "zones": [
      "head_neck",
      "torso",
      "underarms"
    ],
    "why": "Still air stops sweat from evaporating, so your clothes soak through faster and your body heats up across the face and back.",
    "relief": [
      "Open a window or door, or step outside into open air.",
      "Switch on a ceiling fan or desk fan, or use a folding hand fan.",
      "Hold your shirt collar or hem and flap it up and down to push air across your torso.",
      "Stand near an open doorway or hallway draft so air moves through from two sides."
    ],
    "lifestyle": [
      "Carry a small battery-powered pocket fan whenever you enter enclosed spaces such as classrooms, offices or buses.",
      "When choosing where to sit or work, pick the spot nearest a window, door or vent."
    ],
    "flag": null
  },
  {
    "id": "crowded_space",
    "label": "Crowded Space",
    "phase": 1,
    "kind": "thermal",
    "zones": [
      "hands",
      "head_neck",
      "underarms"
    ],
    "why": "Crowded rooms add other people's body heat to your own and add social pressure. Heat and nerves together switch on sweating on the palms, face and underarms.",
    "relief": [
      "Step out to a quiet hallway, balcony or restroom for 3 minutes.",
      "Hold a cold bottle or drink in both hands to cool your palms and give your mind something to focus on.",
      "Look at an exit or open window and take slow belly breaths: in for 4 seconds, out for 6.",
      "Unbutton your collar or loosen your cuffs to let trapped heat out."
    ],
    "lifestyle": [
      "At events and on transport, choose an aisle seat or a spot near a door or open window so you can cool down or step out quickly.",
      "Arrive 10 minutes early so you can pick your spot before the crowd builds. It also lowers the worry of being stuck."
    ],
    "flag": null
  },
  {
    "id": "bright_lights",
    "label": "Bright Lights",
    "phase": 1,
    "kind": "thermal",
    "zones": [
      "head_neck"
    ],
    "why": "Strong lights give off radiant heat and strain the eyes, which pushes up sweating across your forehead, face and scalp.",
    "relief": [
      "Put on UV-blocking sunglasses, or dim the lights above you if you can.",
      "Move away from direct stage lights, studio lamps or bare bulbs.",
      "Blot your face gently with a soft tissue or oil-blotting sheet. Press, don't wipe.",
      "Close your eyes for 30 seconds while resting a cool palm on your forehead."
    ],
    "lifestyle": [
      "Set up your workspace with soft, indirect LED lighting (lamps that bounce light off a wall or ceiling instead of shining at you) and consider anti-glare glasses.",
      "Under strong lights, take a 20-second eye break and a sip of cool water every 30 minutes."
    ],
    "flag": null
  },
  {
    "id": "loud_noises",
    "label": "Loud Noises",
    "phase": 1,
    "kind": "emotional",
    "zones": [
      "hands",
      "feet",
      "underarms"
    ],
    "why": "A sudden loud sound makes your body jump into alert mode (a startle reflex). That quick surge of the sympathetic nervous system makes your palms, soles and underarms sweat.",
    "relief": [
      "Put in noise-cancelling earplugs or headphones.",
      "Step out of the noise into a quieter space.",
      "Press your palms firmly together or squeeze a stress ball for 5 seconds, then release. Repeat 3 times.",
      "Breathe in for 4 seconds and out for 6 seconds, several times, to slow the alert response."
    ],
    "lifestyle": [
      "Keep earplugs on your keychain or in your bag for concerts, loud transport and busy venues.",
      "Where you can, choose quieter times and places for errands and meet-ups."
    ],
    "flag": null
  },
  {
    "id": "no_clear_trigger",
    "label": "No Clear Trigger",
    "phase": 1,
    "kind": "none",
    "zones": [
      "hands",
      "feet",
      "underarms"
    ],
    "why": "Sometimes sweating arrives with no obvious cause. This is common in primary focal hyperhidrosis, where the nerve signal to the sweat glands fires on its own, most often on the palms, soles and underarms.",
    "relief": [
      "Wipe your palms, soles or underarms dry with a soft towel or clinical wipe.",
      "Hold a cold pack against the back of your neck for 2 minutes to calm the signal.",
      "Sip cold water slowly and try the 5-4-3-2-1 grounding exercise: name 5 things you see, 4 you feel, 3 you hear, 2 you smell and 1 you taste.",
      "Add a note about what you were doing in the 10 minutes before the sweating started. Tiny details often reveal hidden triggers over time."
    ],
    "lifestyle": [
      "Use a clinical-strength antiperspirant (a stronger formula than supermarket ones) every night before bed, on completely dry skin, when your sweat glands are least active. That is when it works best.",
      "When no trigger is clear, jot down what you ate, wore, felt and where you were. After a few entries, patterns usually appear."
    ],
    "flag": null
  },
  {
    "id": "work_pressure",
    "label": "Work Pressure",
    "phase": 2,
    "kind": "emotional",
    "zones": [
      "hands",
      "head_neck",
      "underarms"
    ],
    "why": "Deadlines and being evaluated release stress hormones such as adrenaline, which switch on the sweat glands on your palms, face and underarms.",
    "relief": [
      "Step away from your screen for a 2-minute walk.",
      "Hold a cold mug, glass of ice water or any cold object in both hands for a minute.",
      "Try box breathing: in for 4 seconds, hold 4, out 4, hold 4. Repeat 4 times.",
      "Place a paper towel under your wrists or palms while typing so the desk and keyboard stay dry."
    ],
    "lifestyle": [
      "Break big tasks into small deadlines and take a 5-minute break every hour. Fewer pressure peaks mean fewer sweat peaks.",
      "Do your most demanding work in the cooler part of the day and keep a cold drink at your desk."
    ],
    "flag": null
  },
  {
    "id": "fear",
    "label": "Fear",
    "phase": 2,
    "kind": "emotional",
    "zones": [
      "hands",
      "feet",
      "head_neck",
      "torso"
    ],
    "why": "Sudden fear sets off a fight-or-flight burst of adrenaline. The result is cold sweat on the palms, soles, face and chest.",
    "relief": [
      "Press your feet flat into the floor and notice the ground under you. It tells your brain you are physically safe.",
      "Press a cold wet wipe to your forehead, temples and the back of your neck.",
      "Breathe in deeply through your nose, add a second short sip of air on top, then let it all out slowly through your mouth. This is called a physiological sigh and it calms the body quickly.",
      "Squeeze a soft ball or your fist tightly for 5 seconds, then release."
    ],
    "lifestyle": [
      "Practise progressive muscle relaxation (tensing and releasing each muscle group in turn) for 10 minutes a day so your body learns to settle faster.",
      "After a scare, shake out your arms and legs for 30 seconds to burn off the adrenaline."
    ],
    "flag": null
  },
  {
    "id": "stress",
    "label": "Stress",
    "phase": 2,
    "kind": "emotional",
    "zones": [
      "hands",
      "feet",
      "head_neck",
      "torso"
    ],
    "why": "Ongoing stress keeps cortisol high, which makes your brain's sweat-control centre more sensitive. Sweating then starts at lower and lower triggers on the palms, feet, face and back.",
    "relief": [
      "Drink a glass of cold water slowly.",
      "Wash your hands and face with cool running water.",
      "Remove extra layers or loosen tight accessories such as a watch, tie or belt.",
      "Spend 5 minutes in a quiet room with low light and no screens."
    ],
    "lifestyle": [
      "Add 10 minutes of mindfulness, meditation or gentle yoga to your morning or evening. Lower everyday stress lowers your sweating threshold.",
      "Protect your sleep with a regular bedtime. Poor sleep keeps stress hormones high the next day."
    ],
    "flag": null
  },
  {
    "id": "anxiety",
    "label": "Anxiety",
    "phase": 2,
    "kind": "emotional",
    "zones": [
      "hands",
      "underarms",
      "head_neck",
      "groin_thighs"
    ],
    "why": "Worry keeps your sympathetic nervous system switched on, so sweating can show up on the palms, underarms, face and groin even when you are not hot.",
    "relief": [
      "Wrap an ice cube in a cloth and hold it on the centre of your chest or your wrists for 30 to 60 seconds.",
      "Try 4-7-8 breathing: in for 4 seconds, hold for 7, out for 8. Repeat 4 times to help your body settle.",
      "Pat the damp skin dry gently with a clean handkerchief or towel.",
      "Say slowly to yourself as you breathe out: 'I am safe, and this sweat episode will pass.'"
    ],
    "lifestyle": [
      "Cut back on caffeine, especially after midday. It amplifies the body's anxiety response and your sweat response with it.",
      "Set aside 10 minutes earlier in the day to write down what is worrying you, so the worry has less room to ambush you later."
    ],
    "flag": null
  },
  {
    "id": "anticipatory_sweating",
    "label": "Anticipatory Sweating",
    "phase": 2,
    "kind": "emotional",
    "zones": [
      "hands",
      "underarms",
      "head_neck"
    ],
    "why": "Worrying about sweating can itself cause sweating. The fear sets off the nerve signal, which makes more sweat, which makes you worry more. It is a loop, and it can be broken.",
    "relief": [
      "Tell yourself: 'Sweating is a natural body reflex and I can handle it.' Accepting the feeling without panic weakens the loop.",
      "Run your hands under cold water for 30 seconds.",
      "Before an important event, dust absorbent powder on your palms or underarms.",
      "Count backwards from 100 in sevens, or name 5 objects around you, to pull your attention away."
    ],
    "lifestyle": [
      "Wear patterns, dark colours or a light jacket so damp patches are less visible. Less fear of being seen means a weaker loop.",
      "Gradually practise low-stakes social situations while accepting a little sweat. Each time nothing bad happens, the loop loses strength."
    ],
    "flag": null
  },
  {
    "id": "public_speaking",
    "label": "Public Speaking",
    "phase": 2,
    "kind": "emotional",
    "zones": [
      "head_neck",
      "hands",
      "underarms"
    ],
    "why": "Being evaluated in front of others sends a rush of stress hormones such as adrenaline through your body, causing visible sweating on the face, scalp, palms and underarms.",
    "relief": [
      "Drink cold water just before you step up.",
      "Keep a discreet handkerchief or cloth in your pocket or on the podium.",
      "Rest your hands on a cool lectern or hold a cold bottle just before you start.",
      "Pause, take one slow breath, and speak at a steady pace to bring your heart rate down."
    ],
    "lifestyle": [
      "Apply clinical-strength antiperspirant to your palms and underarms the night before a big talk, on dry skin.",
      "Rehearse out loud twice in the real room or a similar one. Familiarity lowers the adrenaline spike on the day."
    ],
    "flag": null
  },
  {
    "id": "nervousness",
    "label": "Nervousness",
    "phase": 2,
    "kind": "emotional",
    "zones": [
      "hands",
      "head_neck",
      "feet"
    ],
    "why": "Mild nerves nudge the sweat glands on your palms, soles and forehead into action.",
    "relief": [
      "Run cold water over the insides of your wrists for 20 seconds.",
      "Fan yourself gently with a notebook, folder or handheld fan.",
      "Take 3 slow belly breaths with long exhales.",
      "Blot your forehead or palms with a dry tissue."
    ],
    "lifestyle": [
      "Practise small, regular social moments, such as brief chats with a cashier or neighbour, to build confidence and calm the reflex.",
      "Do a 2-minute calm breathing routine before situations that usually make you nervous."
    ],
    "flag": null
  },
  {
    "id": "embarrassment",
    "label": "Embarrassment",
    "phase": 2,
    "kind": "emotional",
    "zones": [
      "head_neck"
    ],
    "why": "Sudden self-consciousness makes your face flush (blood vessels widen) and your sweat glands fire at the same time, mostly on the face, scalp and neck.",
    "relief": [
      "Go to a restroom and splash cool water on your face and neck.",
      "Press a cold can or drink against your cheeks and forehead.",
      "Slow your breathing so each breath out is longer than the breath in. It lowers the heat in your face.",
      "Blot your face gently with a soft tissue or oil-control sheets."
    ],
    "lifestyle": [
      "Remind yourself that sweating is an automatic body response, not a personal flaw. Saying it out loud to someone you trust takes much of the sting out.",
      "Keep a small face kit (blotting sheets, cooling mist, tissues) in your bag so you never feel caught out."
    ],
    "flag": null
  },
  {
    "id": "excitement",
    "label": "Excitement",
    "phase": 2,
    "kind": "emotional",
    "zones": [
      "hands",
      "head_neck",
      "underarms"
    ],
    "why": "Even happy excitement revs up your sympathetic nervous system, so your palms, face and underarms can sweat.",
    "relief": [
      "Pause and take 2 slow, deep breaths.",
      "Hold a chilled drink in your hands for a minute.",
      "Step into a cooler area or stand near a fan.",
      "Wipe your palms or forehead with a clean cloth."
    ],
    "lifestyle": [
      "Channel the energy into calm movement, such as a short walk or structured breathing, before the exciting event.",
      "Eat lightly and skip caffeine before big exciting events. Both add to the body's buzz."
    ],
    "flag": null
  },
  {
    "id": "anger_frustration",
    "label": "Anger / Frustration",
    "phase": 2,
    "kind": "emotional",
    "zones": [
      "head_neck",
      "torso",
      "hands"
    ],
    "why": "Frustration releases adrenaline, which raises body heat and causes heavy sweating on the forehead, back, chest and palms.",
    "relief": [
      "Walk away for a 5-minute timeout.",
      "Splash cold water on your face, neck and hands.",
      "Unclench your jaw, drop your shoulders and open your hands.",
      "Breathe in through your nose and blow out firmly through your lips."
    ],
    "lifestyle": [
      "Use a physical outlet such as brisk walking, boxing or other aerobic exercise to work off frustration, ideally in a cool place.",
      "Name the feeling early ('I'm getting frustrated') and take your timeout before the heat builds."
    ],
    "flag": null
  },
  {
    "id": "dancing",
    "label": "Dancing",
    "phase": 3,
    "kind": "physical",
    "zones": [
      "head_neck",
      "torso",
      "feet",
      "underarms"
    ],
    "why": "Dancing makes your muscles produce heat, so your body's cooling system works hard. Sweat appears across the face, back, chest and feet.",
    "relief": [
      "Take a 5-minute break off the floor in a cool, ventilated spot.",
      "Blot your forehead, neck and underarms with a dry gym towel.",
      "Sip cold water or an electrolyte drink to replace what you've lost.",
      "Stand in front of a fan or air conditioner for a few minutes."
    ],
    "lifestyle": [
      "Wear moisture-wicking dance clothes (fabrics that move sweat away from your skin) and put antiperspirant on your feet and underarms before you dance.",
      "Pace yourself: alternate fast and slow songs and step out for a 2-minute cool-down every 30 minutes."
    ],
    "flag": null
  },
  {
    "id": "trekking_walking",
    "label": "Trekking / Walking",
    "phase": 3,
    "kind": "physical",
    "zones": [
      "torso",
      "feet",
      "groin_thighs",
      "head_neck"
    ],
    "why": "Walking uphill or for a long time makes your muscles produce heat, so your body sweats steadily across your back, chest, feet, groin and face to cool you down.",
    "relief": [
      "Slow your pace or pause in a shaded spot for 3 to 5 minutes.",
      "Take off your backpack or outer layer for a few minutes so heat can escape from your back.",
      "Wipe the back of your neck and forehead with a cold wet cloth or cooling towel.",
      "Take small sips of cold water every 10 to 15 minutes."
    ],
    "lifestyle": [
      "Wear breathable mesh walking shoes and use a ventilated backpack that holds itself off your back so air can move across it.",
      "Start treks early morning or late afternoon, pre-cool with a cold drink and a face rinse, and take short shade breaks BEFORE you feel overheated."
    ],
    "flag": null
  },
  {
    "id": "exercise_exertion",
    "label": "Exercise / Exertion",
    "phase": 3,
    "kind": "physical",
    "zones": [
      "head_neck",
      "torso",
      "underarms",
      "hands",
      "feet"
    ],
    "why": "Hard exercise raises your core temperature fast. The all-over sweating you get is your cooling system doing its job.",
    "relief": [
      "Drape a cool damp towel around your neck and shoulders during breaks.",
      "Stand or sit in front of a gym fan between sets.",
      "Take small sips of cold water throughout your workout.",
      "Change into a dry shirt straight after finishing."
    ],
    "lifestyle": [
      "Work out in air-conditioned spaces or in the cool early morning.",
      "Drink a glass of cold water 20 minutes before you start and build in a 1-minute cool-down between intervals."
    ],
    "flag": null
  },
  {
    "id": "spicy_food",
    "label": "Spicy Food",
    "phase": 3,
    "kind": "physical",
    "zones": [
      "head_neck"
    ],
    "why": "Chilli contains capsaicin, which tricks the heat sensors in your mouth into thinking you are overheating. Your forehead, nose, scalp and upper lip then sweat. This is called gustatory sweating.",
    "relief": [
      "Drink cold milk or eat yoghurt. Dairy helps wash capsaicin off your mouth's heat sensors.",
      "Blot your face and scalp with soft napkins.",
      "Hold cold water in your mouth or let an ice cube melt on your tongue.",
      "Fan your face until the burning feeling fades."
    ],
    "lifestyle": [
      "Cut back on hot peppers and try milder seasonings. Herbs, garlic and lemon add flavour without the heat.",
      "If you love spicy food, eat it in a cool room with a cold drink, and not right before something important."
    ],
    "flag": null
  },
  {
    "id": "caffeine_coffee",
    "label": "Caffeine / Coffee",
    "phase": 3,
    "kind": "physical",
    "zones": [
      "hands",
      "feet",
      "underarms"
    ],
    "why": "Caffeine stimulates your nervous system, raising heart rate and blood pressure, and can wake up the sweat glands on your palms, feet and underarms.",
    "relief": [
      "Drink a large glass of cold water to cool down and stay hydrated.",
      "Step into a cool, well-ventilated room or near a fan.",
      "Wipe your palms and underarms dry with an absorbent cloth.",
      "Do 3 minutes of slow breathing to bring your heart rate down."
    ],
    "lifestyle": [
      "Switch to decaf, green tea or herbal tea, or halve your usual coffee for two weeks and compare your logs.",
      "Keep caffeine to the morning only. Later doses are still active in your body when stress or heat arrive."
    ],
    "flag": null
  },
  {
    "id": "hot_drinks",
    "label": "Hot Drinks",
    "phase": 3,
    "kind": "physical",
    "zones": [
      "head_neck"
    ],
    "why": "Hot liquids warm your mouth and throat, which raises head and neck temperature and can trigger sweating on the face and scalp.",
    "relief": [
      "Let your drink cool to warm or room temperature before sipping.",
      "Alternate sips of ice water with your warm drink.",
      "Take off an extra layer while you drink.",
      "Dab your face with a soft napkin."
    ],
    "lifestyle": [
      "Choose iced or room-temperature drinks on warm or stressful days.",
      "Have hot drinks in a cool, ventilated spot, and not right before a meeting or presentation."
    ],
    "flag": null
  },
  {
    "id": "alcohol",
    "label": "Alcohol",
    "phase": 3,
    "kind": "physical",
    "zones": [
      "head_neck",
      "torso"
    ],
    "why": "Alcohol widens your blood vessels (flushing) and disturbs your brain's temperature control, which can cause sweating on the face, chest and back, including at night.",
    "relief": [
      "Drink a glass of water for every alcoholic drink.",
      "Splash cool water over your face and neck.",
      "Step outside for a few minutes of cool air.",
      "Sleep under a light, breathable sheet with a fan blowing across the bed."
    ],
    "lifestyle": [
      "Limit alcohol, especially in the hours before sleep.",
      "Choose lighter drinks, alternate with water, and stop drinking at least 3 hours before bed."
    ],
    "flag": null
  },
  {
    "id": "heavy_meals",
    "label": "Heavy Meals",
    "phase": 3,
    "kind": "physical",
    "zones": [
      "torso",
      "head_neck"
    ],
    "why": "Digesting a big, rich meal produces extra heat inside your body, which warms your core temperature and makes your torso sweat.",
    "relief": [
      "Sit by an open window or fan after eating.",
      "Sip cold water slowly after the meal.",
      "Loosen your belt or waistband so you are comfortable.",
      "Avoid vigorous activity right after eating."
    ],
    "lifestyle": [
      "Eat smaller, more frequent meals instead of a few heavy ones.",
      "Pick lighter, less greasy meals when it is hot or before important events, and finish eating at least 2 hours before bed."
    ],
    "flag": null
  },
  {
    "id": "nicotine",
    "label": "Nicotine",
    "phase": 3,
    "kind": "physical",
    "zones": [
      "hands",
      "feet",
      "underarms"
    ],
    "why": "Nicotine activates the nerve receptors that drive your sweat glands, directly triggering sweating on the palms, feet and underarms.",
    "relief": [
      "Wash your hands with cool running water straight after smoking or vaping.",
      "Drink cold water.",
      "Step into a cool, ventilated area.",
      "Breathe slowly and deeply to settle the heart-rate rise nicotine causes."
    ],
    "lifestyle": [
      "Ask a doctor or pharmacist about a nicotine-reduction plan or quitting aids. Stopping removes this trigger completely.",
      "In the meantime, delay each cigarette or vape by 10 minutes and log how your sweating changes."
    ],
    "flag": null
  },
  {
    "id": "blood_pressure_meds",
    "label": "Blood Pressure Meds",
    "phase": 4,
    "kind": "systemic",
    "zones": [
      "torso",
      "head_neck"
    ],
    "why": "Some blood pressure tablets change how wide your blood vessels are, which can cause sweating on the torso, back and face as a side effect. When sweating is a side effect of something else it is called secondary hyperhidrosis.",
    "relief": [
      "Rest in a cool, shaded place.",
      "Cool your forehead, neck and inner arms with a damp towel.",
      "Sip cool or room-temperature water steadily.",
      "Stand up slowly. Blood pressure tablets can make you dizzy when you rise quickly."
    ],
    "lifestyle": [
      "Keep a medication log in HidroAlly with the time of each dose and when the sweating starts, and share it with your doctor.",
      "Never stop or change your blood pressure tablets on your own. Ask your doctor about timing or alternatives."
    ],
    "flag": "you linked this episode to blood pressure medication, and sweating can be a side effect of those tablets"
  },
  {
    "id": "insulin_diabetes_meds",
    "label": "Insulin / Diabetes Meds",
    "phase": 4,
    "kind": "systemic",
    "zones": [
      "hands",
      "head_neck",
      "torso"
    ],
    "why": "When your blood sugar drops too low (hypoglycemia), your body sounds an emergency alarm. That causes sudden cold sweats, shakiness and damp palms and face.",
    "relief": [
      "If you have a blood sugar meter, check your glucose right away.",
      "If your blood sugar is low, take 15 g of fast sugar (fruit juice, glucose tablets or honey) and recheck in 15 minutes. If you feel confused, faint or cannot swallow, call emergency services.",
      "Sit down in a safe, cool place.",
      "Wipe sweat from your face and neck with a soft towel while you rest."
    ],
    "lifestyle": [
      "Keep regular meal times and carry glucose tablets or a sugary snack everywhere.",
      "Share your logs with your diabetes care team and ask whether your dose timing could be adjusted."
    ],
    "flag": "you linked this episode to diabetes medication, and low blood sugar can cause sweating that needs medical follow-up"
  },
  {
    "id": "new_medication",
    "label": "New Medication",
    "phase": 4,
    "kind": "systemic",
    "zones": [
      "torso",
      "head_neck"
    ],
    "why": "Starting a new medicine can shift your brain's temperature settings and cause sweating as a side effect (drug-induced sweating).",
    "relief": [
      "Sip cold water throughout the day.",
      "Dress in light cotton layers.",
      "Use a portable fan or damp compress when needed.",
      "Write down the time you took each dose and when the sweating started."
    ],
    "lifestyle": [
      "Ask your doctor or pharmacist whether sweating is a known side effect of your medicine and whether alternatives exist. Do not stop it on your own.",
      "Write down the date you started the medicine and any dose changes, so we can check if your sweating pattern lines up."
    ],
    "flag": "you linked this episode to a new medication, and many medicines can cause sweating as a side effect"
  },
  {
    "id": "supplements_herbal",
    "label": "Supplements / Herbal",
    "phase": 4,
    "kind": "systemic",
    "zones": [
      "head_neck",
      "torso"
    ],
    "why": "Some supplements, such as niacin, fat burners and ginseng, widen blood vessels or speed up your metabolism, causing sweating on the face, chest and back.",
    "relief": [
      "Stop what you are doing and sit in a cool, ventilated room.",
      "Sip cold water.",
      "Place a cold wet wipe on your forehead and the back of your neck.",
      "Unbutton upper layers so air can cool you."
    ],
    "lifestyle": [
      "Pause thermogenic (heat-producing) or blood-vessel-widening supplements for 2 weeks, after checking with a doctor or pharmacist if you take other medicines, and see whether sweating eases.",
      "Introduce one supplement at a time and log it, so you can tell which one is responsible."
    ],
    "flag": "you linked this episode to supplements, and some supplements raise body heat or widen blood vessels"
  },
  {
    "id": "hormonal_menopause",
    "label": "Hormonal / Menopause",
    "phase": 4,
    "kind": "systemic",
    "zones": [
      "head_neck",
      "torso"
    ],
    "why": "Falling or fluctuating oestrogen disturbs your brain's thermostat, so you get sudden heat waves (hot flushes) with heavy sweating across the head, face, neck and chest.",
    "relief": [
      "Place a cooling gel wrap or ice pack (wrapped in cloth) on the back of your neck.",
      "Sip ice water through a straw at the first sign.",
      "Aim a fan at your face and chest.",
      "Dress in layers you can remove quickly."
    ],
    "lifestyle": [
      "Practise slow cooling breaths (about 6 breaths a minute for 15 minutes a day) and talk to your gynaecologist about hormonal and non-hormonal options.",
      "Note what sets off your hot flushes (alcohol, spicy food, caffeine) and where you are in your cycle."
    ],
    "flag": "you linked this episode to hormonal changes, which can cause sweating that is not primary hyperhidrosis"
  },
  {
    "id": "fever_infection",
    "label": "Fever / Infection",
    "phase": 4,
    "kind": "systemic",
    "zones": [
      "torso",
      "head_neck",
      "hands",
      "feet",
      "underarms",
      "groin_thighs"
    ],
    "why": "A fever raises your body's temperature setting. When the fever breaks, your body sweats heavily all over to cool back down to normal.",
    "relief": [
      "Rest under a light cotton sheet rather than heavy blankets.",
      "Wipe your body gently with lukewarm (not cold) water.",
      "Sip oral rehydration salts or electrolyte water often.",
      "Change damp clothes and bedding once the sweating settles."
    ],
    "lifestyle": [
      "Check your temperature with a thermometer and follow your doctor's advice on fever medicine such as paracetamol (acetaminophen).",
      "If fevers keep coming back, or come with night sweats or weight loss, see a doctor."
    ],
    "flag": "you linked this episode to a fever or infection, which can cause sweating from an underlying illness"
  }
];

export const AREA_FALLBACK: Record<string, string[]> = {
  "head_neck": [
    "Press a cool damp cloth against your temples (the soft spots beside your eyes) and forehead for one minute.",
    "Rinse your face and the back of your neck with cool, not ice-cold, water, then pat dry. Do not rub.",
    "Sip cold water and aim a small fan at your face for 2 minutes, with your chin slightly raised so air reaches your neck."
  ],
  "hands": [
    "Run cool water over your palms and inner wrists for 30 seconds, then dry them thoroughly with a clean towel.",
    "Hold a cold bottle in both hands for a minute, then dry your palms and dust on a little absorbent powder.",
    "Open and close your fists slowly 10 times while breathing out, then wipe your palms dry."
  ],
  "feet": [
    "Take your shoes and socks off for 10 minutes, wipe your soles dry and let them air out.",
    "Change into fresh moisture-wicking socks and dust a little foot powder between the toes.",
    "Stand on a cool tile floor or rest your feet on a cold, dry surface for 5 minutes."
  ],
  "underarms": [
    "Raise your arms for 90 seconds in a ventilated spot, then press a cool absorbent cloth under each arm.",
    "Blot each underarm dry with a soft towel, then apply a thin layer of antiperspirant to completely dry skin.",
    "Slip a clean tissue or absorbent pad between your underarm and your shirt and swap it when it gets damp."
  ],
  "torso": [
    "Peel your shirt away from your back and chest and fan it for 1 to 2 minutes in a ventilated spot.",
    "Hold a cool damp cloth on the back of your neck and upper back for a minute.",
    "Change into a dry, breathable top as soon as you can and let the damp one dry in the air."
  ],
  "groin_thighs": [
    "Pat the area dry with a soft towel, then dust on absorbent powder to cut moisture and friction.",
    "Change into dry, breathable cotton underwear and loose clothing.",
    "Apply an anti-chafing balm to the inner thighs before moving around again."
  ],
  "all": [
    "Move to a cool, ventilated room, sit down, and sip cold water slowly for 5 minutes.",
    "Lay a cool damp towel across your neck and shoulders and stay still until the sweating settles.",
    "Change into dry, loose cotton clothing and stand in front of a fan for a few minutes."
  ]
};

// [key, regex source (case-insensitive), plain meaning]
export const GLOSSARY: Array<[string, string, string]> = [
  [
    "eccrine",
    "eccrine (?:sweat )?glands?",
    "the everyday sweat glands across your skin that cool you down"
  ],
  [
    "sympathetic",
    "sympathetic nervous system",
    "your body's automatic fight-or-flight wiring, which speeds you up under heat or stress"
  ],
  [
    "autonomic",
    "autonomic nervous system",
    "the part of your nervous system that runs things you do not control, like sweating and heartbeat"
  ],
  [
    "pulse",
    "pulse points?",
    "spots where blood vessels run close to the skin, such as the insides of the wrists and the sides of the neck"
  ],
  [
    "adrenaline",
    "adrenaline",
    "the stress hormone that gives you a sudden surge of energy"
  ],
  [
    "cortisol",
    "cortisol",
    "your body's main long-term stress hormone"
  ],
  [
    "capsaicin",
    "capsaicin",
    "the compound that makes chilli hot"
  ],
  [
    "gustatory",
    "gustatory sweating",
    "sweating triggered by food or drink"
  ],
  [
    "core",
    "core temperature",
    "the temperature deep inside your body"
  ],
  [
    "electrolyte",
    "electrolyte",
    "containing the salts and minerals you lose in sweat"
  ],
  [
    "dehumidifier",
    "dehumidifier",
    "a machine that removes moisture from the air"
  ],
  [
    "primary",
    "primary (?:focal )?hyperhidrosis",
    "excess sweating in specific spots, with no other medical cause behind it"
  ],
  [
    "secondary",
    "secondary hyperhidrosis",
    "excess sweating that is a side effect of something else, such as a medicine, hormones or a health condition"
  ],
  [
    "focal",
    "focal zones?",
    "spots where primary hyperhidrosis typically shows up, usually on both sides of the body"
  ]
];

export const TREATMENTS: Record<string, Array<[string, string]>> = {
  "hands": [
    [
      "iontophoresis",
      "iontophoresis (your hands rest in shallow water while a very mild electric current passes through, which temporarily quietens the sweat glands)"
    ],
    [
      "clinical antiperspirant",
      "prescription-strength antiperspirant (a stronger formula applied at night to dry skin)"
    ],
    [
      "oral tablets",
      "oral tablets that dampen the nerve signal that switches sweat glands on (your doctor weighs benefits against side effects like dry mouth)"
    ],
    [
      "botulinum toxin",
      "botulinum toxin injections (tiny injections that temporarily block the nerve signal to the sweat glands for several months)"
    ]
  ],
  "feet": [
    [
      "iontophoresis",
      "iontophoresis (your feet rest in shallow water while a very mild electric current passes through, which temporarily quietens the sweat glands)"
    ],
    [
      "clinical antiperspirant",
      "prescription-strength antiperspirant (a stronger formula applied at night to dry skin)"
    ],
    [
      "botulinum toxin",
      "botulinum toxin injections (tiny injections that temporarily block the nerve signal to the sweat glands for several months)"
    ]
  ],
  "underarms": [
    [
      "clinical antiperspirant",
      "prescription-strength antiperspirant (a stronger formula applied at night to dry skin)"
    ],
    [
      "botulinum toxin",
      "botulinum toxin injections (tiny injections that temporarily block the nerve signal to the sweat glands for several months)"
    ],
    [
      "topical cloths",
      "medicated wipes or creams that block the nerve signal locally, where available"
    ],
    [
      "gland removal device",
      "in-clinic heat-based treatments that permanently reduce underarm sweat glands"
    ]
  ],
  "head_neck": [
    [
      "topical creams",
      "medicated creams or wipes that block the nerve signal locally (some are used off-label on the face, so ask your dermatologist)"
    ],
    [
      "oral tablets",
      "oral tablets that dampen the nerve signal that switches sweat glands on (your doctor weighs benefits against side effects like dry mouth)"
    ],
    [
      "botulinum toxin",
      "botulinum toxin injections (tiny injections that temporarily block the nerve signal to the sweat glands for several months)"
    ]
  ],
  "torso": [
    [
      "find the cause",
      "a check for common causes such as medicines, thyroid, blood sugar or hormones, because trunk sweating usually improves when the cause is treated"
    ],
    [
      "clinical antiperspirant",
      "prescription-strength antiperspirant (a stronger formula applied at night to dry skin)"
    ]
  ],
  "groin_thighs": [
    [
      "find the cause",
      "a check for common causes such as medicines, thyroid, blood sugar or hormones, because sweating here usually improves when the cause is treated"
    ],
    [
      "clinical antiperspirant",
      "prescription-strength antiperspirant (a stronger formula applied at night to dry skin)"
    ]
  ],
  "all": [
    [
      "find the cause",
      "blood tests and a medication review to look for an underlying cause, which is the usual first step for sweating over the whole body"
    ]
  ]
};

export const HDSS_LONG: Record<number, string> = {
  "1": "your sweating is never noticeable and never gets in the way of your day",
  "2": "your sweating is tolerable but sometimes gets in the way",
  "3": "your sweating is barely tolerable and often gets in the way of daily activities",
  "4": "your sweating is intolerable and always gets in the way of daily activities"
};
export const HDSS_SHORT: Record<number, string> = {
  "1": "mild, never in the way",
  "2": "tolerable, sometimes in the way",
  "3": "barely tolerable, often in the way",
  "4": "intolerable, always in the way"
};
