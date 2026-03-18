import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext();


// Initial seating layout data for both libraries
const generateSeats = (total) => {
  return Array.from({ length: total }, (_, i) => ({
    id: i + 1,
    number: i + 1,
    occupancy: [], 
  }));
};

const LAYOUT_CONFIGS = {
  'Rudraksh Library - Branch 1': {
    id: 'lib1',
    totalSeats: 70, // Changed from 50 to 70
    color: '#c0392b',
    lightBg: '#fff5f5',
    icon: '🏛️',
    zones: {
      REF: { label: 'REFERENCE SECTION (1-13)', carrels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] },
      MID_R: { label: 'READING AREA RIGHT (14-20, 31-37)', carrels: [20, 19, 18, 17, 16, 15, 14, 31, 32, 33, 34, 35, 36, 37] },
      MID_L: { label: 'READING AREA LEFT (21-30)', carrels: [25, 24, 23, 22, 21, 26, 27, 28, 29, 30] },
      FICTION: { label: 'FICTION STACKS (44-53)', carrels: [48, 47, 46, 45, 44, 49, 50, 51, 52, 53] },
      NONFIC: { label: 'NON-FICTION STACKS (38-43, 54-59)', carrels: [43, 42, 41, 40, 39, 38, 54, 55, 56, 57, 58, 59] },
      PERIODIC: { label: 'PERIODICALS & CIRCULATION (60-70)', carrels: [70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60] },
    },
  },
  'Rudraksh Library - Branch 2': {
    id: 'lib2',
    totalSeats: 50, // Changed from 70 to 50
    color: '#1565c0',
    lightBg: '#f0f4ff',
    icon: '📖',
    zones: {
      A: { label: 'ZONE A (CARRELS 1-6)', carrels: [6, 5, 4, 3, 2, 1] },
      B: { label: 'READING BAY B (CARRELS 7-16)', carrels: [7, 8, 9, 10, 11, 16, 15, 14, 13, 12] },
      C: { label: 'READING BAY C (CARRELS 17-26)', carrels: [17, 18, 19, 20, 21, 26, 25, 24, 23, 22] },
      D: { label: 'READING BAY D (CARRELS 27-36)', carrels: [27, 28, 29, 30, 31, 36, 35, 34, 33, 32] },
      E: { label: 'READING BAY E (CARRELS 37-46)', carrels: [37, 38, 39, 40, 41, 46, 45, 44, 43, 42] },
      F: { label: 'READING BAY F (CARRELS 47-50)', carrels: [47, 48, 49, 50] },
    },
  },
};

const DEFAULT_LAYOUT = {
  totalSeats: 50,
  color: '#2e7d32',
  lightBg: '#e8f5e9',
  icon: '📚',
  zones: {
    A: { label: 'ZONE A', carrels: Array.from({length: 25}, (_, i) => i + 1) },
    B: { label: 'ZONE B', carrels: Array.from({length: 25}, (_, i) => i + 26) },
  }
};

const API_BASE_URL = 'https://library-backend-ivory-delta.vercel.app/api';

// ─── Safe Storage Wrapper ───────────────────────────────────────
// Prevents "module is null" crashes by falling back to memory
const memoryStorage = {};
const SafeStorage = {
  getItem: async (key) => {
    try {
      const val = await AsyncStorage.getItem(key);
      return val;
    } catch (e) {
      return memoryStorage[key] || null;
    }
  },
  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      memoryStorage[key] = value;
    }
  },
  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      delete memoryStorage[key];
    }
  }
};

export const AppProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [libraries, setLibraries] = useState([]);
  const [students, setStudents] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      try {
        const savedLogin = await SafeStorage.getItem('isLoggedIn');
        if (savedLogin === 'true') {
          setIsLoggedIn(true);
          const savedUser = await SafeStorage.getItem('userData');
          if (savedUser) setUserData(JSON.parse(savedUser));
        }
      } catch (storageErr) {
        // Handled by SafeStorage
      }

      const url = `${API_BASE_URL}/libraries`;
      const libRes = await fetch(url).catch(() => null);

      if (!libRes || !libRes.ok) return;

      const backendLibs = await libRes.json();

      if (!Array.isArray(backendLibs) || backendLibs.length === 0) {
        setLibraries([]);
        return;
      }

      // 2. Map and assign layouts
      const fetchedLibs = backendLibs.map((bl) => {
        const config = LAYOUT_CONFIGS[bl.name] || { ...DEFAULT_LAYOUT };
        return {
          ...bl,
          id: config.id || `lib-${bl._id}`,
          dbId: bl._id,
          name: bl.name,
          address: bl.location || 'Jaipur',
          totalSeats: config.totalSeats || 50,
          color: config.color,
          lightBg: config.lightBg,
          icon: config.icon,
          zones: config.zones,
          seats: generateSeats(config.totalSeats || 50),
        };
      });

      // 3. Fetch Students for all libraries
      const allStudents = {};
      for (const lib of fetchedLibs) {
        try {
          const stuRes = await fetch(`${API_BASE_URL}/students/library/${lib.dbId}`);
          if (stuRes.ok) {
            const data = await stuRes.json();
            allStudents[lib.id] = Array.isArray(data) ? data : [];
          } else {
            allStudents[lib.id] = [];
          }
        } catch (err) {
          allStudents[lib.id] = [];
        }
      }

      setStudents(allStudents);
      
      // 4. Update seat occupancy
      const finalLibs = fetchedLibs.map(lib => {
        const libStudents = allStudents[lib.id] || [];
        const seats = lib.seats.map(seat => {
          const occupancy = libStudents
            .filter(s => s.seatNumber === seat.number)
            .map(s => ({ shift: s.shift, studentId: s._id }));
          return { ...seat, occupancy };
        });
        return { ...lib, seats };
      });

      setLibraries(finalLibs);
    } catch (e) {
      console.log('Sync Error:', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      if (!response.ok) {
        return { success: false, error: result.message || 'Login failed' };
      }

      setIsLoggedIn(true);
      setUserData(result.user);
      try {
        await SafeStorage.setItem('isLoggedIn', 'true');
        await SafeStorage.setItem('userData', JSON.stringify(result.user));
      } catch (storageErr) {
        // Handled by SafeStorage
      }
      
      await loadData();
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Could not connect to server' };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
    } catch (e) {
      console.log('Logout API failed:', e);
    }
    setIsLoggedIn(false);
    setUserData(null);
    try {
      await SafeStorage.setItem('isLoggedIn', 'false');
      await SafeStorage.removeItem('userData');
    } catch (storageErr) {
      // Handled by SafeStorage
    }
  };

  const addStudent = async (libraryId, studentData) => {
    const lib = libraries.find(l => l.id === libraryId);
    if (!lib.dbId) {
       throw new Error("Library not found in backend database");
    }

    const payload = {
      ...studentData,
      libraryId: lib.dbId,
    };

    const response = await fetch(`${API_BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Registration failed");
    }

    // Refresh data after successful add
    await loadData();
    return result.student;
  };

  const deleteStudent = async (libraryId, studentId) => {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || "Delete failed");
    }

    // Refresh data after delete
    await loadData();
  };

  const updateStudent = async (studentId, updatedData) => {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Update failed");
    }

    // Refresh data after successful update
    await loadData();
    return result.student;
  };

  const renewStudent = async (studentId, renewalData) => {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(renewalData),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Renewal failed");
    }

    // Refresh data after successful renewal
    await loadData();
    return result.student;
  };

  const updateCredentials = async (newUsername, newPassword) => {
    if (!userData?._id) throw new Error("User session not found. Please log in again.");

    const response = await fetch(`${API_BASE_URL}/auth/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: userData._id, 
        newUsername, 
        newPassword 
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to update credentials");
    }

    if (result.user) {
      setUserData(result.user);
      await SafeStorage.setItem('userData', JSON.stringify(result.user));
    }
    return result;
  };

  const getLibraryStats = (libraryId) => {
    const lib = libraries.find(l => l.id === libraryId);
    const libStudents = students[libraryId] || [];
    
    // A seat is "fully occupied" if it has a FULL_DAY shift or both morning/evening
    const occupiedCount = lib?.seats.filter(seat => {
      const shifts = seat.occupancy?.map(o => o.shift) || [];
      return shifts.includes('FULL_DAY') || (shifts.includes('MORNING') && shifts.includes('EVENING'));
    }).length || 0;

    return {
      totalSeats: lib?.totalSeats || 0,
      occupiedSeats: occupiedCount,
      totalStudents: libStudents.length,
    };
  };

  return (
    <AppContext.Provider value={{
      isLoggedIn,
      isLoading,
      libraries,
      students,
      login,
      logout,
      addStudent,
      updateStudent,
      deleteStudent,
      renewStudent,
      getLibraryStats,
      userData,
      updateCredentials,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
