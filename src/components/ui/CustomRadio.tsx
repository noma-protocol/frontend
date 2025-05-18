import * as React from "react"
import { Box, Button } from "@chakra-ui/react"
import { isMobile } from "react-device-detect"

const CustomRadio = (props) => {
  const { value, name, children, isDisabled, isChecked, onChange } = props;
  
  let bgColor = "#a67c00"; 

  const handleClick = () => {
    if (!isDisabled && onChange) {
      onChange(value);
    }
  };

  if (name == "useWeth") {
     if (isChecked) {
      bgColor = "#a67c00"; // Highlight color for checked state
    } else {
      bgColor = "transparent"; // Default color for unchecked state
    }
  }

  if (name == "tradeModeBuy") {
    if (isChecked) {
      bgColor = "green"; // Highlight color for checked state
    } else {
      bgColor = "transparent"; // Default color for unchecked state
    }
  } else if (name == "tradeModeSell") {
    if (isChecked) {
      bgColor = "red"; // Highlight color for checked state
    } else {
      bgColor = "transparent"; // Default color for unchecked state
    }
  }
  
  return (
    <Button
      onClick={handleClick}
      cursor={isDisabled ? "not-allowed" : "pointer"}
      variant="outline"
      bg={bgColor}
      color={isChecked ? "white" : "inherit"}
      borderWidth="1px"
      borderRadius="md"
      opacity={isDisabled ? 0.6 : 1}
      px={3}
      py={1}
      h={"25px"}
      w={isMobile ? "90px" : "60px"}
      mt={-1}
      variant="outline"
      fontSize="13px"
      border="1px solid gray"
    >
      {children}
    </Button>
  )
}
 
export default CustomRadio;