import { reviewSignals } from './review.mjs';

export const products = {
  MATCH_MINI: { cards:3, questions:2 }, MATCH_FULL: { cards:6, questions:5 },
  GIFT_MINI: { cards:1, questions:0 }, GIFT_BOOK: { cards:4, questions:0 },
  JOURNAL_PROMPT: { cards:1, questions:5 }, JOURNAL_REVIEW: { cards:3, questions:1 },
};
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const keys = (v, allowed) => object(v) && Object.keys(v).every(k=>allowed.includes(k));
const text = (v,max) => typeof v === 'string' && v.trim().length > 0 &&
  [...v].length <= max && !/[<>]/.test(v);

// context はサーバー側で固定した許可済み根拠。モデル出力から作らない。
export function validateContent(value, context) {
  const errors=[];
  if (!keys(value,['schemaVersion','productId','title','cards','questions','limitations'])) return ['Invalid root fields'];
  const spec = products[value.productId];
  if (!spec || value.productId !== context.productId) errors.push('Product mismatch');
  if (value.schemaVersion !== '1.0') errors.push('Invalid version');
  if (!text(value.title,60) || !text(value.limitations,400)) errors.push('Invalid title or limitations');
  if (!Array.isArray(value.cards) || value.cards.length !== spec?.cards) errors.push('Card count');
  if (!Array.isArray(value.questions) || value.questions.length !== spec?.questions ||
    !value.questions.every(q=>text(q,160))) errors.push('Questions');
  if (!Array.isArray(context.allowedEvidenceIds) || !context.allowedEvidenceIds.length) errors.push('Missing trusted evidence');
  if (value.productId === 'JOURNAL_REVIEW' && (!Number.isInteger(context.selectedEntryCount) ||
    context.selectedEntryCount<1 || context.selectedEntryCount>7)) errors.push('Selected entry count');
  const ids=new Set();
  for (const card of Array.isArray(value.cards) ? value.cards : []) {
    if (!keys(card,['id','heading','body','evidenceIds']) || !text(card.id,40) || ids.has(card.id) ||
      !text(card.heading,60) || !text(card.body,600)) { errors.push('Invalid card'); continue; }
    ids.add(card.id);
    if (!Array.isArray(card.evidenceIds) || !card.evidenceIds.length ||
      new Set(card.evidenceIds).size !== card.evidenceIds.length ||
      !card.evidenceIds.every(id=>typeof id==='string' && context.allowedEvidenceIds?.includes(id))) errors.push('Invalid evidence');
  }
  return errors;
}

// 本文の個人情報・意味の検査と所有権確認は別途必要。ここでは内部フィールドを落とす。
export function publicCards(value, selectedIds, context) {
  if(value?.productId==='JOURNAL_REVIEW') throw new Error('Use separate journal public copy');
  if (validateContent(value,context).length) throw new Error('Invalid content');
  if (!Array.isArray(selectedIds) || !selectedIds.length || new Set(selectedIds).size!==selectedIds.length ||
    !selectedIds.every(id=>value.cards.some(c=>c.id===id))) throw new Error('Invalid selection');
  const output = { title:value.title, limitations:value.limitations,
    cards:value.cards.filter(c=>selectedIds.includes(c.id)).map(({id,heading,body})=>({id,heading,body})) };
  if (reviewSignals({...output,questions:[]},context.privateTexts??[]).length) throw new Error('Public content requires privacy review');
  return output;
}
