import React, { createContext, useState, useContext } from "react";

export type MenuContextType = {
  isMenuOpen: boolean;
  setIsMenuOpen: (state: boolean) => void;
};

export const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <MenuContext.Provider value={{ isMenuOpen, setIsMenuOpen }}>
      {children}
    </MenuContext.Provider>
  );
};

export const useMenu = () => {
    const context = useContext(MenuContext);
    if (!context) {
      console.error("useMenu: MenuContext is undefined. Ensure MenuProvider wraps the component.");
      throw new Error("useMenu must be used within a MenuProvider");
    }
    console.log("useMenu accessed:", context); // Debugging log
    return context;
  };
  