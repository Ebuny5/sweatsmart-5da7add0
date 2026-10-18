/**
 * areaCare.ts  (src/features/insights/areaCare.ts)
 * For each body area the patient actually logged: how to care for it, how to
 * stop an episode before it starts, and what to do when it happens.
 * Keys match canonArea() in insightsAnalytics.ts. No drug names or doses.
 */
export interface AreaCare { care: string[]; prevent: string[]; manage: string[]; note?: string }

export const AREA_CARE: Record<string, AreaCare> = {
  palms: {
    care: ["Wash with cool water and dry thoroughly, including between the fingers.", "Keep a small cotton cloth with you and dab, never rub."],
    prevent: ["Put antiperspirant on dry palms at night if a pharmacist or doctor agrees it suits you.", "Before a stressful moment, run cool water over your wrists for 30 seconds."],
    manage: ["Hold a cold bottle or a cool damp cloth in your palms for a minute.", "Take 5 slow belly breaths: in for 4 seconds, out for 6."],
  },
  hands: {
    care: ["Wash with cool water and dry the whole hand, back and fingers.", "Use a light, non-greasy moisturiser so the skin does not crack."],
    prevent: ["Rinse hands in cool water before tasks that make them damp.", "Wear thin breathable gloves for long gripping jobs."],
    manage: ["Run cool water over your hands and wrists, then pat dry.", "Rest your hands palms up in a cool, shaded spot for a few minutes."],
  },
  fingers: {
    care: ["Dry between the fingers after washing.", "Keep nails short so moisture does not collect underneath."],
    prevent: ["Dust a little absorbent powder on dry fingers before typing or holding a phone for long.", "Take short breaks from gripping phones, pens or tools."],
    manage: ["Wipe your fingers with a dry cloth and let air reach them.", "Shake out your hands for 20 seconds, then rinse with cool water."],
  },
  face: {
    care: ["Wash with cool water and a gentle cleanser, then pat dry. Never rub.", "Use an oil-free moisturiser and a sunscreen that will not clog pores."],
    prevent: ["Carry a cooling mist or a damp cloth on days when heat or stress is expected.", "Skip very hot drinks and spicy food before important events."],
    manage: ["Press a cool damp cloth on your temples and forehead for one minute.", "Blot with a tissue instead of wiping, and step into shade or a fan's breeze."],
  },
  scalp: {
    care: ["Keep the scalp clean with a gentle shampoo and rinse well.", "Let your hair dry fully so moisture does not sit on the scalp."],
    prevent: ["Wear a loose, breathable cap or scarf in heat instead of tight headwear.", "Keep hair short or tied up on hot days."],
    manage: ["Take off hats or headwear for a few minutes so heat can escape.", "Fan your scalp and blot it with a clean cloth."],
  },
  face_scalp: {
    care: ["Wash face and scalp with cool water and gentle products, then dry gently.", "Use oil-free skincare and let your hair dry fully."],
    prevent: ["Carry a cooling mist or damp cloth when heat or stress is expected.", "Wear loose headwear in the heat."],
    manage: ["Press a cool damp cloth on your temples and forehead for one minute.", "Take off headwear for a few minutes and fan your face."],
  },
  head: {
    care: ["Rinse your head and neck with cool water and dry well.", "Choose breathable fabrics near the hairline."],
    prevent: ["Drink something cold before going into the heat.", "Avoid tight headwear."],
    manage: ["Lay a cool damp cloth on the forehead and the back of the neck.", "Move to shade or a ventilated spot."],
  },
  neck: {
    care: ["Dry the neck and any skin folds well after washing.", "Choose soft collars and avoid scratchy synthetic fabrics."],
    prevent: ["Wear open or loose collars in the heat.", "Carry a thin cotton scarf or cloth to absorb moisture."],
    manage: ["Lay a cool cloth on the back of your neck for a minute.", "Loosen your collar and fan your neck."],
  },
  feet_soles: {
    care: ["Wash feet daily, dry between the toes, and change socks when they are damp.", "Rotate your shoes so each pair dries fully before you wear it again."],
    prevent: ["Choose breathable shoes and cotton or moisture-wicking socks.", "Use foot powder, or antiperspirant on dry feet, if it suits you."],
    manage: ["Take your shoes off, wipe your feet dry and let them air for 10 minutes.", "Change into fresh socks and stand on a cool floor."],
  },
  toes: {
    care: ["Dry between the toes thoroughly after washing.", "Keep nails trimmed and toe gaps clean."],
    prevent: ["Wear open or breathable footwear whenever you can.", "Use thin cotton or toe socks to absorb moisture."],
    manage: ["Dry between the toes and let them air.", "Change damp socks promptly."],
  },
  underarms: {
    care: ["Wash and dry well, then wear breathable cotton or bamboo tops.", "Trim underarm hair if it helps, since damp hair holds moisture."],
    prevent: ["Apply antiperspirant to dry skin at night, when sweat glands are least active.", "Keep a spare top or absorbent pads in your bag."],
    manage: ["Raise your arms in a ventilated spot for 90 seconds, then press a cool cloth under each arm.", "Blot dry and change a damp top as soon as you can."],
  },
  chest: {
    care: ["Wear loose, breathable tops and wash damp clothes promptly.", "Dry under any skin folds well."],
    prevent: ["Avoid tight synthetic clothing in the heat.", "Eat lighter meals before hot or stressful situations."],
    manage: ["Peel your top away from your chest and fan it for 1 to 2 minutes.", "Sip cold water and move somewhere ventilated."],
  },
  back: {
    care: ["Shower and dry well, then wear breathable layers.", "Wash bags and straps that stay damp."],
    prevent: ["Use a ventilated backpack, or carry bags in your hand when it is hot.", "Wear cotton or moisture-wicking layers."],
    manage: ["Take off your bag or outer layer for a few minutes.", "Hold a cool damp cloth on your upper back or neck."],
  },
  groin: {
    care: ["Wash gently and dry well, then wear loose cotton underwear.", "Change out of damp clothing quickly."],
    prevent: ["Dust absorbent powder on dry skin before long days.", "Avoid tight synthetic underwear and leggings."],
    manage: ["Pat dry and change into dry underwear when you can.", "Use an anti-chafing balm on skin that rubs."],
  },
  thighs: {
    care: ["Dry thoroughly after washing, especially skin folds.", "Wear loose, breathable clothing."],
    prevent: ["Use an anti-chafing balm or powder on dry skin.", "Choose shorts or skirts that do not rub."],
    manage: ["Pat dry and let air reach the skin.", "Change out of damp fabric."],
  },
  whole_body: {
    care: ["Shower in lukewarm water and wear light cotton layers.", "Keep a regular sleep and drinking-water routine."],
    prevent: ["Plan outdoor activities for the cooler hours and stay in ventilated places.", "Note when whole-body sweating happens and what you were doing."],
    manage: ["Move to a cool, ventilated room and sip cold water slowly.", "Change into dry clothes and rest for a few minutes."],
    note: "Sweating over the whole body is worth mentioning to a doctor, who can check for a cause.",
  },
};

export const AREA_CARE_DEFAULT: AreaCare = {
  care: ["Wash with cool water and dry the area thoroughly.", "Wear breathable fabrics that touch this area."],
  prevent: ["Carry a small cloth or fan when you expect heat or stress.", "Take short breaks in a cool, ventilated place."],
  manage: ["Press a cool damp cloth on the area for a minute.", "Move to shade or a fan's breeze and sip cold water."],
};
