import Icon from './Icon.jsx';

/** Native <select> wrapped with the editorial chevron. */
export default function Select({ value, onChange, children, className = '', title, style }) {
  return (
    <span className="select-wrap" style={style}>
      <select className={`select ${className}`} value={value} onChange={(e) => onChange(e.target.value)} title={title}>
        {children}
      </select>
      <span className="chev"><Icon name="chevron-down" size={16} /></span>
    </span>
  );
}
