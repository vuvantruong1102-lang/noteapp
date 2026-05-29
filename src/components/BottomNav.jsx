import { NavLink } from "react-router-dom";

const items = [
  { to: "/", ico: "📝", label: "Ghi chú", end: true },
  { to: "/zh", ico: "🀄", label: "Tiếng Trung" },
  { to: "/translate", ico: "🔤", label: "Dịch câu" },
];

export default function BottomNav() {
  return (
    <nav className="bottomnav">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          className={({ isActive }) => "navitem" + (isActive ? " active" : "")}
        >
          <span className="ico">{it.ico}</span>
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}
