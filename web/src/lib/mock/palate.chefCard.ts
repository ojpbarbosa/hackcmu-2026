const CARDS: Record<string, (a: string) => { native: string; english: string }> = {
  th: (a) => ({ native: `ขอโทษค่ะ อาหารจานนี้มี${a}ไหมคะ แพ้${a}ค่ะ`, english: `Sorry — does this dish contain ${a}? I am allergic to ${a}.` }),
  pt: (a) => ({ native: `Com licenca, este prato leva ${a}? Sou alergico a ${a}.`, english: `Excuse me — does this dish contain ${a}? I am allergic to ${a}.` }),
  en: (a) => ({ native: `Does this dish contain ${a}? I am allergic to ${a}.`, english: `Does this dish contain ${a}? I am allergic to ${a}.` }),
};

export default function mock(input: { allergen?: string; language?: string }) {
  const a = input?.allergen ?? 'peanut';
  const lang = (input?.language ?? 'en').slice(0, 2).toLowerCase();
  return (CARDS[lang] ?? CARDS.en)(a);
}
