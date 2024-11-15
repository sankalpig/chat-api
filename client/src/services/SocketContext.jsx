import React, { createContext, useContext, useState } from 'react';

// Create context with a default value (can be empty object or null)
const SocketContext = createContext(null);

export const useSocket = () => {
    // Ensure useContext has a valid value when the context is accessed
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket must be used within a SocketProvider");
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [callerSignalData, setCallerSignalData] = useState(null);

    return (
        <SocketContext.Provider value={{ callerSignalData, setCallerSignalData }}>
            {children}
        </SocketContext.Provider>
    );
};

