import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const items = [
  { to: "/", ico: "📝", label: "Ghi chú", end: true },
  { to: "/zh", ico: "🀄", label: "Tiếng Trung" },
  { to: "/translate", ico: "🔤", label: "Dịch câu" },
];

export default function Sidebar() {
  const { signOut } = useAuth();
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="logo">🀄</span>
        <span className="name">Hán Notes</span>
      </div>
      <nav className="nav">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end}
            className={({ isActive }) => "navlink" + (isActive ? " active" : "")}>
            <span className="ico">{it.ico}</span>
            <span>{it.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="spacer" />
      <button className="signout" onClick={() => signOut()}>
        <span className="ico">⏻</span>
        <span>Đăng xuất</span>
      </button>
    </aside>
  );
}
