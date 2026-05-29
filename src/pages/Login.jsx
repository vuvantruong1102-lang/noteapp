import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("in");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    setErr(""); setMsg(""); setBusy(true);
    const fn = mode === "in" ? signIn : signUp;
    const { error } = await fn(email.trim(), pass);
    setBusy(false);
    if (error) return setErr(error.message);
    if (mode === "up") setMsg("Đã tạo tài khoản. Nếu yêu cầu xác nhận email, kiểm tra hộp thư rồi đăng nhập.");
  }

  return (
    <div className="center" style={{ minHeight: "82vh" }}>
      <div style={{ width: 380, maxWidth: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="brand-mark" style={{ width: 44, height: 44, fontSize: 18, margin: "0 auto" }}>V</div>
          <h1 className="page-title" style={{ marginTop: 14, fontSize: 24 }}>VTNotes</h1>
          <p className="page-sub" style={{ marginTop: 6 }}>Ghi chú & học tiếng Trung</p>
        </div>
        <div className="card card-pad stack">
          <div>
            <p className="field-label">Email</p>
            <input className="input" type="email" value={email} autoCapitalize="none"
              onChange={(e) => setEmail(e.target.value)} placeholder="ban@email.com" />
          </div>
          <div>
            <p className="field-label">Mật khẩu</p>
            <input className="input" type="password" value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••••" />
          </div>
          {err && <div className="tiny" style={{ color: "#c2185b" }}>{err}</div>}
          {msg && <div className="tiny" style={{ color: "var(--accent-700)" }}>{msg}</div>}
          <button className="btn block" onClick={submit} disabled={busy || !email || !pass}>
            {busy ? "Đang xử lý…" : mode === "in" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
          <div className="tiny muted center">
            {mode === "in" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
            <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(""); }}
              style={{ color: "var(--accent-700)", fontWeight: 600, marginLeft: 6 }}>
              {mode === "in" ? "Đăng ký" : "Đăng nhập"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
