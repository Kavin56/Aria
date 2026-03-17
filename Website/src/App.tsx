import { Navigate, Route, Routes } from "react-router-dom";
import { ApiKeysPage } from "./pages/ApiKeysPage";
import { WorkersPage } from "./pages/WorkersPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/api-keys" replace />} />
      <Route path="/api-keys" element={<ApiKeysPage />} />
      <Route path="/workers" element={<WorkersPage />} />
      <Route path="*" element={<Navigate to="/api-keys" replace />} />
    </Routes>
  );
}

