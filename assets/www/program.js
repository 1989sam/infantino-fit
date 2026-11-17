// Programme de départ : les 5 séances "Entraînement Chris"
// Format d'une série : [poids kg, reps (texte "8-10"), durée s, distance km]
window.DEFAULT_PROGRAM = [
  { name: "Jour 1 — Pecs / Épaules / Abdos", color: "#e3242f",
    notes: "Échauffement : 2 séries de chauffe.",
    ex: [
      { id: "Dumbbell_Bench_Press", rest: 90, sets: 4, w: 26, r: "8-10", notes: "Barre ou haltères — à fond dans la 4e série. Variante : développé incliné haltères 3x8-10 (22 kg)." },
      { id: "Incline_Dumbbell_Flyes", rest: 90, sets: 4, w: 12, r: "10-12" },
      { id: "Straight-Arm_Dumbbell_Pullover", rest: 90, sets: 3, w: 20, r: "15", notes: "Noté : 20 kg → 10 reps" },
      { id: "Seated_Side_Lateral_Raise", rest: 60, sets: 4, w: 10, r: "12-15" },
      { id: "Knee_Hip_Raise_On_Parallel_Bars", mode: "r", rest: 60, sets: 5, r: "10", notes: "Leg raise sur chaise romaine" }
    ] },
  { name: "Jour 2 — Jambes", color: "#2f8cff",
    notes: "Échauffement avant de commencer.",
    ex: [
      { id: "Narrow_Stance_Leg_Press", rest: 120, sets: 4, w: 160, r: "10-15", notes: "Presse oblique, pieds bas et serrés. 160 kg + poids de la presse." },
      { id: "Leg_Extensions", rest: 90, sets: 4, w: 73, r: "8-10" },
      { id: "Bodyweight_Walking_Lunge", mode: "wr", rest: 90, sets: 3, w: 10, r: "10", notes: "10 pas par jambe — haltères 10 kg / main" },
      { id: "Seated_Leg_Curl", rest: 90, sets: 4, w: 41, r: "8-10", notes: "Ischios assis OU couché" },
      { id: "Standing_Calf_Raises", rest: 90, sets: 4, w: 40, r: "20" }
    ] },
  { name: "Jour 3 — Dos", color: "#19b36b",
    notes: "Échauffement avant de commencer.",
    ex: [
      { id: "Wide-Grip_Pulldown_Behind_The_Neck", rest: 90, sets: 4, w: 52, r: "8-10" },
      { id: "Close-Grip_Front_Lat_Pulldown", rest: 90, sets: 3, w: 52, r: "8-10", notes: "Prise étroite en pronation" },
      { id: "One-Arm_Dumbbell_Row", rest: 90, sets: 4, w: 26, r: "6-8", notes: "Buste penché. Noté : 26/8 kg" },
      { id: "Seated_One-arm_Cable_Pulley_Rows", rest: 90, sets: 3, w: 22.5, r: "10-12", notes: "Poulie haute, 1 bras, assis par terre" },
      { id: "Upright_Barbell_Row", rest: 90, sets: 4, w: 20, r: "8", notes: "Prise large — cadre ou barre si occupé (2 x 10 kg)" },
      { id: "Crunches", mode: "r", rest: 60, sets: 1, r: "100", notes: "1 exercice abdos au choix — 1 série de 100 reps (69 reps min.)" }
    ] },
  { name: "Jour 4 — Épaules", color: "#f5a623",
    notes: "Échauffement avant de commencer.",
    ex: [
      { id: "Seated_Dumbbell_Press", rest: 90, sets: 4, w: 26, r: "10-12" },
      { id: "Seated_Side_Lateral_Raise", rest: 60, sets: 3, w: 10, r: "15", notes: "Noté : 10 kg 4x10" },
      { id: "Seated_Bent-Over_Rear_Delt_Raise", rest: 60, sets: 4, w: 6, r: "15", notes: "Oiseau buste penché — noté : 6 kg x 12" },
      { id: "Front_Dumbbell_Raise", rest: 60, sets: 3, w: 6, r: "12", notes: "Assis, alterné" },
      { id: "Crunches", mode: "r", rest: 60, sets: 3, r: "20", notes: "1 exercice abdos au choix" },
      { id: "Walking_Treadmill", mode: "td", rest: 0, sets: 1, t: 900, notes: "Cardio 15 min au choix — 4 à 5 km/h, pente 10 à 15 %" }
    ] },
  { name: "Jour 5 — Bras", color: "#a259ff",
    notes: "Échauffement avant de commencer.",
    ex: [
      { id: "Barbell_Curl", rest: 90, sets: 3, w: 30, r: "8-10" },
      { id: "Incline_Hammer_Curls", rest: 90, sets: 3, r: "8-10", notes: "Poids à définir" },
      { id: "Standing_Biceps_Cable_Curl", rest: 90, sets: 3, w: 22.5, r: "8-10", notes: "Poulie basse, prise étroite" },
      { id: "Triceps_Pushdown_-_V-Bar_Attachment", rest: 90, sets: 3, w: 27, r: "8-10" },
      { id: "Dip_Machine", mode: "ar", rest: 90, sets: 3, w: 23, r: "15", notes: "Dips assistés : assistance 23 kg → objectif descendre à 14 kg" },
      { id: "Triceps_Pushdown_-_V-Bar_Attachment", rest: 90, sets: 3, w: 11.3, r: "12", notes: "À voir selon ton coude" },
      { id: "Walking_Treadmill", mode: "td", rest: 0, sets: 1, t: 900, notes: "Cardio 15 min au choix" }
    ] }
];
