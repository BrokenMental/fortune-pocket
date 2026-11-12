// 보조 탐지다. 통과를 개인정보 부재나 의미 정확성의 증명으로 쓰지 않는다.
export function reviewSignals(content, privateTexts=[]) {
  const visible=[content.title,content.limitations,...content.questions,
    ...content.cards.flatMap(c=>[c.heading,c.body])].join('\n');
  const normalize=s=>s.normalize('NFKC').replace(/\s/g,'');
  const signals=[];
  if(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(visible)) signals.push('email');
  if(/01[016789][- .]?\d{3,4}[- .]?\d{4}/.test(visible)) signals.push('phone');
  if(privateTexts.some(t=>typeof t==='string' && t.trim() && normalize(visible).includes(normalize(t)))) signals.push('private-text');
  if(/지침을 무시|시스템 프롬프트|ignore (?:all |previous )?instructions/i.test(visible)) signals.push('instruction-echo');
  return [...new Set(signals)];
}
