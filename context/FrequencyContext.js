import React, { createContext, useState, useContext } from "react";

// Create a Context for the frequency
const FrequencyContext = createContext();

// Create a Provider component
export const FrequencyProvider = ({ children }) => {
  const [frequency, setFrequency] = useState(1); // Default to once daily

  return (
    <FrequencyContext.Provider value={{ frequency, setFrequency }}>
      {children}
    </FrequencyContext.Provider>
  );
};

// Custom hook to use the Frequency Context
export const useFrequency = () => {
  return useContext(FrequencyContext);
};
