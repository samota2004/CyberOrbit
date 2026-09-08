import React, { createContext, useContext, useState, useEffect } from 'react';
const ThemeContext = createContext(undefined);
export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('cyberorbit_theme');
            if (saved === 'light' || saved === 'dark')
                return saved;
        }
        return 'dark';
    });
    useEffect(() => {
        const root = document.documentElement;
        const body = document.body;
        localStorage.setItem('cyberorbit_theme', theme);
        if (theme === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light-theme');
            body.classList.add('dark');
            body.classList.remove('light-theme');
            body.style.backgroundColor = '#0E0E0E';
            body.style.color = '#FFFFFF';
        }
        else {
            root.classList.remove('dark');
            root.classList.add('light-theme');
            body.classList.remove('dark');
            body.classList.add('light-theme');
            body.style.backgroundColor = '#F7F4EC';
            body.style.color = '#0E0E0E';
        }
    }, [theme]);
    const setTheme = (newTheme) => {
        setThemeState(newTheme);
    };
    const toggleTheme = () => {
        setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
    };
    return (<ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>);
};
const fallbackThemeContext = {
    theme: 'dark',
    setTheme: () => { },
    toggleTheme: () => { },
    isDark: true,
};
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        return fallbackThemeContext;
    }
    return context;
};
