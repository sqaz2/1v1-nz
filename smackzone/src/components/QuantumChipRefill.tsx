import { useState } from 'react';

function question() {
  return [2 + Math.floor(Math.random() * 18), 2 + Math.floor(Math.random() * 18)];
}

export default function QuantumChipRefill({ onEarn, disabled }: { onEarn: () => void; disabled: boolean }) {
  const [[left, right], setQuestion] = useState(question);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  return <form className="my-3 rounded-xl border border-cyan-500/30 bg-slate-800 p-4 text-center"
    onSubmit={event => {
      event.preventDefault();
      if (disabled) return;
      if (answer.trim() && Number(answer) === left + right) {
        setAnswer(''); setFeedback(''); setQuestion(question()); onEarn();
      } else setFeedback('Try that sum again.');
    }}>
    <p className="text-sm text-cyan-200 mb-2">Low on chips? Solve a sum for 600 Quantum Chips.</p>
    <label className="text-white">{left} + {right} = <input aria-label="Math answer" inputMode="numeric"
      value={answer} onChange={event => setAnswer(event.target.value)} disabled={disabled}
      className="w-20 rounded bg-slate-950 p-3 text-white" /></label>
    <button disabled={disabled} className="ml-2 rounded bg-cyan-800 px-4 py-3 text-white">Earn chips</button>
    <p role="status" className="text-sm text-amber-200 mt-2">{feedback}</p>
  </form>;
}
