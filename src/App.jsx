import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Login from "./pages/Login.jsx";
import Notes from "./pages/Notes.jsx";
import NoteEditor from "./pages/NoteEditor.jsx";
import Chinese from "./pages/Chinese.jsx";
import Translate from "./pages/Translate.jsx";

function Guard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center" style={{ height: "60vh" }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  const loc = useLocation();
  const showSidebar = user && loc.pathname !== "/login";

  return (
    <div className="app">
      {showSidebar && <Sidebar />}
      <main className="main">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/" element={<Guard><Notes /></Guard>} />
          <Route path="/note/new" element={<Guard><NoteEditor /></Guard>} />
          <Route path="/note/:id" element={<Guard><NoteEditor /></Guard>} />
          <Route path="/zh" element={<Guard><Chinese /></Guard>} />
          <Route path="/translate" element={<Guard><Translate /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
