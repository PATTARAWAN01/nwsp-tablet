import React, { createContext, useContext, useState, useEffect } from 'react';
import { deviceService } from '../services/deviceService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('anywhere_admin_logged') === 'true';
  });

  const [teacherSession, setTeacherSession] = useState(() => {
    try {
      const saved = localStorage.getItem('anywhere_teacher_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [config, setConfig] = useState({
    academic_years: ["2569"],
    current_academic_year: "2569",
    current_round: 1,
    admin_password: "nwsp1234"
  });

  const [loading, setLoading] = useState(true);

  // Load config on startup
  const refreshConfig = async () => {
    try {
      const cfg = await deviceService.getConfig();
      setConfig(cfg);
    } catch (e) {
      console.error("Failed to load config:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  // Admin login
  const loginAdmin = async (password) => {
    const validPass = config.admin_password || "nwsp1234";
    if (String(password).trim() === String(validPass).trim()) {
      setIsAdmin(true);
      localStorage.setItem('anywhere_admin_logged', 'true');
      return { success: true };
    }
    return { success: false, message: "รหัสผ่านไม่ถูกต้อง (รหัสผ่านเริ่มต้นคือ nwsp1234)" };
  };

  // Admin logout
  const logoutAdmin = () => {
    setIsAdmin(false);
    localStorage.removeItem('anywhere_admin_logged');
  };

  // Teacher Room login with PIN & Teacher Name
  const loginTeacherRoom = async (grade, room, pin, teacherName) => {
    const roomKey = grade === 'ครู' ? 'ครู' : `${grade}/${room}`;
    const isValid = await deviceService.verifyRoomPin(roomKey, pin);
    
    if (isValid) {
      const sessionData = { 
        grade, 
        room, 
        roomKey, 
        teacherName: teacherName ? teacherName.trim() : "ครูประจำชั้น",
        timestamp: Date.now() 
      };
      setTeacherSession(sessionData);
      localStorage.setItem('anywhere_teacher_session', JSON.stringify(sessionData));
      return { success: true };
    }
    return { success: false, message: `รหัส PIN ของห้อง ${roomKey} ไม่ถูกต้อง` };
  };

  // Teacher logout
  const logoutTeacher = () => {
    setTeacherSession(null);
    localStorage.removeItem('anywhere_teacher_session');
  };

  // Switch academic year or round (Admin action)
  const updateGlobalSettings = async ({ academicYear, round, academicYearsList, adminPassword }) => {
    const newCfg = {
      ...config,
      ...(academicYear && { current_academic_year: academicYear }),
      ...(round && { current_round: Number(round) }),
      ...(academicYearsList && { academic_years: academicYearsList }),
      ...(adminPassword && { admin_password: adminPassword })
    };
    const updated = await deviceService.updateConfig(newCfg);
    setConfig(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        isAdmin,
        teacherSession,
        config,
        loading,
        loginAdmin,
        logoutAdmin,
        loginTeacherRoom,
        logoutTeacher,
        updateGlobalSettings,
        refreshConfig
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
