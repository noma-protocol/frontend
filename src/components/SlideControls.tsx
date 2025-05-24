import React, { useContext } from "react";
import { LanguageContext, LanguageContextType } from "../core/LanguageProvider";
import {
 
  Box,
} from '@chakra-ui/react';
import { commify } from "../utils";

const SlideControls: React.FC = ({isConnected}) => {
  const ctx = useContext<LanguageContextType>(LanguageContext);

  return ( 
    <>
    <Box>
        <a
            className="btn ml-lg-auto btn-bordered-white"
            onClick={() => open}
            >
            {isConnected
                ? `  Shift  `
                : "Connect"}
        </a> 
    </Box>
    <Box>
        <a
            className="btn ml-lg-auto btn-bordered-white"
            onClick={() => open}
            >
            {isConnected
                ? `  Slide  `
                : "Connect"}
        </a>
    </Box>     
    </>    
  )
}

export default SlideControls;
