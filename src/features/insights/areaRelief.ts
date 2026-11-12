/**
 * areaRelief.ts — immediate relief pool per affected area (≥3 each).
 * The engine rotates through each pool so repeat logs get different advice.
 * Keys are the canonical area names produced by normalizeArea() in insightEngine.ts.
 */
export const AREA_RELIEF: Record<string, string[]> = {
  palms: [
    "Hold a cold water bottle or a cool damp cloth in both palms for 60 to 90 seconds; cooling the hands calms local sweat output.",
    "Run cool (not ice-cold) water over your palms and the inside of your wrists for 30 seconds, then pat dry with a cotton cloth.",
    "Open your hands palms-up in moving air for two minutes, and dab, never rub, with an absorbent tissue.",
    "Take five slow breaths, in for 4 and out for 6; palm sweating responds quickly to a calmer nervous system.",
  ],
  hands: [
    "Rinse both hands and wrists under cool water, then dry the backs, palms and between the fingers fully.",
    "Rest your hands on a cool surface such as a tiled wall or a chilled can for a minute.",
    "Loosen rings, watches and bracelets so trapped heat and moisture can escape.",
  ],
  fingers: [
    "Wipe each finger with a dry cloth and spread them apart in moving air.",
    "Shake out your hands for 20 seconds, then rinse with cool water and pat dry.",
    "Pause gripping phones, pens or tools for a few minutes to let the skin dry.",
  ],
  underarms: [
    "Press a cool damp cloth into each underarm for one minute, then pat completely dry.",
    "Lift and relax your arms away from your sides for a few minutes so air reaches the skin.",
    "Change into a loose cotton or moisture-wicking top, or slip in an absorbent underarm pad.",
    "Sip cold water slowly; lowering core temperature reduces underarm output within minutes.",
  ],
  soles: [
    "Remove your shoes and socks, rinse the soles in cool water and dry them completely, including the heels.",
    "Rest your bare soles on a cool tiled floor for two to three minutes.",
    "Change into a fresh pair of cotton or moisture-wicking socks and open, breathable footwear.",
  ],
  feet: [
    "Take off shoes and socks, rinse your feet in cool water and dry carefully between every toe.",
    "Put on fresh moisture-wicking socks and let the damp pair air out away from your shoes.",
    "Elevate your bare feet in moving air or near a fan for a few minutes.",
    "Dust a small amount of absorbent foot powder over dry feet before putting shoes back on.",
  ],
  toes: [
    "Dry thoroughly between each toe with a soft cloth; trapped moisture there irritates skin fastest.",
    "Spread your toes and let them air out barefoot for a few minutes.",
    "Switch to open footwear or fresh socks so the toe spaces stay dry.",
  ],
  face: [
    "Press a cool damp cloth to your forehead and temples for one minute, then blot dry; do not wipe.",
    "Splash cool water on your face and wrists, then step into shade or a fan's breeze.",
    "Sip ice-cold water slowly; cooling from the inside quickly reduces facial flushing and sweat.",
    "Use blotting paper or a clean tissue to lift sweat without spreading it or irritating the skin.",
  ],
  scalp: [
    "Take off any hat, scarf or headwear for a few minutes so heat can escape from the scalp.",
    "Dampen a cloth with cool water and press it along your hairline and the back of the head.",
    "Fan the scalp directly and lift the hair off the neck, or tie it up, to improve airflow.",
  ],
  "face and scalp": [
    "Press a cool damp cloth along your forehead, temples and hairline for one minute.",
    "Remove headwear and fan your face and scalp until the damp feeling settles.",
    "Sip cold water slowly and stay in shade or air conditioning for five minutes.",
  ],
  head: [
    "Remove headwear and apply a cool damp cloth across the forehead and back of the head.",
    "Sit in shade or air conditioning and let a fan blow across your head and face.",
    "Drink cold water in small sips; the head is very sensitive to rising core temperature.",
  ],
  neck: [
    "Hold a cold pack wrapped in a thin towel on the sides of your neck for one to two minutes; these are pulse points that cool circulating blood.",
    "Loosen collars, ties and scarves so heat can leave the neck and upper chest.",
    "Lift your hair off the neck and let moving air reach the nape.",
  ],
  trunk: [
    "Loosen or unbutton the top layers and let air move across your chest, abdomen and back for a few minutes.",
    "Lay a cool damp towel across the upper back and between the shoulder blades, then over the chest, for one minute each.",
    "Sip cold water slowly; the trunk is your largest sweating surface and responds directly to core temperature.",
    "Change into a loose, moisture-wicking or cotton top and avoid tucked-in or layered clothing that traps heat around the waist and lower back.",
    "Sit or lie so your back is not pressed against a chair or bed; contact traps heat along the spine.",
  ],
  chest: [
    "Unbutton or loosen your top and let a fan blow across the chest for a few minutes.",
    "Place a cool damp cloth on the centre of the chest and below the collarbones for one minute.",
    "Use an absorbent cotton layer or pad under clothing, especially beneath the breast folds, and change it when damp.",
  ],
  back: [
    "Lay a cool damp towel across your upper back and between the shoulder blades for one to two minutes.",
    "Lean forward away from the chair so air can reach your back, and pull damp fabric off the skin.",
    "Change into a loose, light-coloured, breathable top; avoid backpacks and tight straps for now.",
  ],
  groin: [
    "Go somewhere private, rinse the area with cool water and pat it completely dry.",
    "Change into loose cotton or moisture-wicking underwear and avoid tight waistbands.",
    "Apply a light layer of absorbent, fragrance-free powder to dry skin to reduce friction and dampness.",
  ],
  thighs: [
    "Wear loose shorts or a skirt with anti-chafe shorts so the inner thighs do not rub.",
    "Pat the inner thighs dry and apply a light anti-chafe balm or absorbent powder.",
    "Rest with your legs slightly apart in moving air for a few minutes.",
  ],
  legs: [
    "Rest with legs uncovered and elevated in moving air for a few minutes.",
    "Wipe your legs with a cool damp cloth, then let them air-dry.",
    "Switch to loose, breathable trousers or shorts made of cotton or linen.",
  ],
  "entire body": [
    "Move to air conditioning or deep shade and stay still for at least five to ten minutes.",
    "Take a lukewarm-to-cool shower, or sponge your neck, wrists, armpits and groin with cool water.",
    "Drink cold water steadily in small sips and loosen all tight clothing.",
    "If whole-body sweating comes with chest pain, fainting, fever or a racing heart, seek medical care promptly.",
  ],
};

/** Generic pool used for custom areas the library does not recognise. */
export const CUSTOM_AREA_RELIEF = (area: string): string[] => [
  `Cool your ${area} gently with a damp cloth or cool water for about one minute, then pat it completely dry.`,
  `Let air reach your ${area}: loosen any clothing, straps or accessories that cover or press on it.`,
  `Protect the skin of your ${area} from friction and dampness with a breathable cotton layer or a light, fragrance-free absorbent powder.`,
];
