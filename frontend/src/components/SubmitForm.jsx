import React, { useState } from 'react';

export default function SubmitForm({ onSubmit }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(text);
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="submit-form" onSubmit={handleSubmit}>
      <textarea
        placeholder="Paste a raw incident report here (English or Pidgin)…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
      />
      <button type="submit" disabled={submitting}>
        {submitting ? 'Triaging…' : 'Submit report'}
      </button>

      
    </form>
  );
}
