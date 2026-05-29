import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("in"); // 'in' | 'up'
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
    if (mode === "up") setMsg("Đã tạo tài khoản. Kiểm tra email xác nhận nếu được yêu cầu, rồi đăng nhập.");
  }

  return (
    <div className="screen" style={{ paddingTop: 64 }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 40 }}>🀄</div>
        <h1 className="screen-title" style={{ marginTop: 8 }}>Hán Notes</h1>
        <p className="muted" style={{ marginTop: 4 }}>Ghi chú & học tiếng Trung mỗi ngày</p>
      </div>

      <div className="card card-pad stack" style={{ maxWidth: 360, margin: "0 auto" }}>
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
        {err && <div className="tiny" style={{ color: "#d4537e" }}>{err}</div>}
        {msg && <div className="tiny" style={{ color: "var(--green-600)" }}>{msg}</div>}
        <button className="btn block" onClick={submit} disabled={busy || !email || !pass}>
          {busy ? "Đang xử lý…" : mode === "in" ? "Đăng nhập" : "Tạo tài khoản"}
        </button>
        <div className="tiny muted center">
          {mode === "in" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
          <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(""); }}
            style={{ color: "var(--green-600)", fontWeight: 600, marginLeft: 4 }}>
            {mode === "in" ? "Đăng ký" : "Đăng nhập"}
          </button>
        </div>
      </div>
    </div>
  );
}
