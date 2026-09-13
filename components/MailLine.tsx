/**
 * A line of copy where the e-mail address inside it becomes a mailto link.
 * Support runs on e-mail only (no phone number anywhere), so this line is the
 * second door on every dead end: checkout error, 404, /tak, the approval pages.
 */
export default function MailLine({ text, email, href, className = 'measure', role }: { text: string; email: string; href: string; className?: string; role?: string }) {
  if (!text) return null;
  if (!email || !text.includes(email)) return <p className={className} role={role}>{text}</p>;
  const parts = text.split(email);
  return (
    <p className={className} role={role}>
      {parts.map((part, i) => (
        <span key={i}>{part}{i < parts.length - 1 && <a href={href}>{email}</a>}</span>
      ))}
    </p>
  );
}
