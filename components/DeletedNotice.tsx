'use client';
import { useEffect, useState } from 'react';

/**
 * "Slet mit billede nu" on the order page sends the customer here with ?slettet=1. The deletion is the
 * one promise a hesitant person tests, so the page has to say it happened rather than just be the
 * front page again. The parameter is dropped from the URL once read, so a reload does not repeat it.
 */
export default function DeletedNotice({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('slettet') !== '1') return;
    setShow(true);
    sp.delete('slettet');
    const rest = sp.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
  }, []);
  if (!show) return null;
  return <div className="wrap"><p className="container small notice" role="status">{text}</p></div>;
}
