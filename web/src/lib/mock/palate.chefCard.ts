/** Authored allergen cards. The five allergens Palate asks about are written out in
 *  Thai and Portuguese by hand — a card shown to a kitchen is not a place to improvise. */
const CARDS: Record<string, Record<string, { native: string; english: string }>> = {
  th: {
    sesame: {
      native: 'ผมแพ้งาครับ\nจานนี้มีงาหรือน้ำมันงาไหมครับ?',
      english: "I'm allergic to sesame. Does this dish contain sesame or sesame oil?",
    },
    peanut: {
      native: 'ผมแพ้ถั่วลิสงครับ\nจานนี้มีถั่วลิสงหรือน้ำมันถั่วไหมครับ?',
      english: "I'm allergic to peanuts. Does this dish contain peanuts or peanut oil?",
    },
    shellfish: {
      native: 'ผมแพ้กุ้ง ปู หอย ครับ\nจานนี้มีกุ้ง ปู หอย น้ำปลา หรือกะปิไหมครับ?',
      english: "I'm allergic to shellfish. Does this dish contain shrimp, crab, clams or shrimp paste?",
    },
    dairy: {
      native: 'ผมแพ้นมวัวครับ\nจานนี้มีนม เนย หรือครีมไหมครับ?',
      english: "I'm allergic to dairy. Does this dish contain milk, butter or cream?",
    },
    gluten: {
      native: 'ผมกินกลูเตนไม่ได้ครับ\nจานนี้มีแป้งสาลี บะหมี่ หรือซีอิ๊วไหมครับ?',
      english: "I can't eat gluten. Does this dish contain wheat flour, wheat noodles or soy sauce?",
    },
  },
  pt: {
    sesame: {
      native: 'Sou alérgico a sésamo.\nEste prato leva sésamo ou óleo de sésamo?',
      english: "I'm allergic to sesame. Does this dish contain sesame or sesame oil?",
    },
    peanut: {
      native: 'Sou alérgico a amendoim.\nEste prato leva amendoim ou óleo de amendoim?',
      english: "I'm allergic to peanuts. Does this dish contain peanuts or peanut oil?",
    },
    shellfish: {
      native: 'Sou alérgico a marisco.\nEste prato leva camarão, amêijoas ou outro marisco?',
      english: "I'm allergic to shellfish. Does this dish contain shrimp, clams or any other shellfish?",
    },
    dairy: {
      native: 'Sou alérgico a lacticínios.\nEste prato leva leite, manteiga ou natas?',
      english: "I'm allergic to dairy. Does this dish contain milk, butter or cream?",
    },
    gluten: {
      native: 'Não posso comer glúten.\nEste prato leva farinha de trigo, pão ou massa?',
      english: "I can't eat gluten. Does this dish contain wheat flour, bread or pasta?",
    },
  },
  en: {
    sesame: {
      native: "I'm allergic to sesame. Does this dish contain sesame or sesame oil?",
      english: "I'm allergic to sesame. Does this dish contain sesame or sesame oil?",
    },
    peanut: {
      native: "I'm allergic to peanuts. Does this dish contain peanuts or peanut oil?",
      english: "I'm allergic to peanuts. Does this dish contain peanuts or peanut oil?",
    },
    shellfish: {
      native: "I'm allergic to shellfish. Does this dish contain shrimp, crab or clams?",
      english: "I'm allergic to shellfish. Does this dish contain shrimp, crab or clams?",
    },
    dairy: {
      native: "I'm allergic to dairy. Does this dish contain milk, butter or cream?",
      english: "I'm allergic to dairy. Does this dish contain milk, butter or cream?",
    },
    gluten: {
      native: "I can't eat gluten. Does this dish contain wheat flour, bread or soy sauce?",
      english: "I can't eat gluten. Does this dish contain wheat flour, bread or soy sauce?",
    },
  },
};

const GENERIC: Record<string, (a: string) => { native: string; english: string }> = {
  th: (a) => ({
    native: `ผมแพ้${a}ครับ\nจานนี้มี${a}ไหมครับ?`,
    english: `I'm allergic to ${a}. Does this dish contain ${a}?`,
  }),
  pt: (a) => ({
    native: `Sou alérgico a ${a}.\nEste prato leva ${a}?`,
    english: `I'm allergic to ${a}. Does this dish contain ${a}?`,
  }),
  en: (a) => ({
    native: `I'm allergic to ${a}. Does this dish contain ${a}?`,
    english: `I'm allergic to ${a}. Does this dish contain ${a}?`,
  }),
};

export default function mock(input: { allergen?: string; language?: string }) {
  const allergen = (input?.allergen ?? 'peanut').toLowerCase().trim();
  const lang = (input?.language ?? 'en').slice(0, 2).toLowerCase();
  const bank = CARDS[lang] ?? CARDS.en;
  return bank[allergen] ?? (GENERIC[lang] ?? GENERIC.en)(allergen);
}
