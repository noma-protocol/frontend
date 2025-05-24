import { NumberInput as ChakraNumberInput } from "@chakra-ui/react";
import * as React from "react";

// Extend the props interface to include custom props
export interface NumberInputProps extends ChakraNumberInput.RootProps {
  isMobile?: boolean; // Existing custom prop
  marginRight?: string; // New custom prop
  targetValue?: string; // New custom prop
  type?: string; // New custom prop
  setPrice?: any; // New custom prop
  setSupply?: any; // New custom prop
  customStep?: number; // New custom prop
  setTokenSupply?: any; // New custom prop
  step?: number; // New custom prop
  setFloorPrice?: any; // New custom prop
}

export const NumberInputRoot = React.forwardRef<
  HTMLDivElement,
  NumberInputProps
>(function NumberInput(props, ref) {
  const { children, isMobile, type, targetValue, customStep, setPrice, setFloorPrice, setTokenSupply, marginRight, ...rest } = props;

  const  [priceInternal, setPriceInternal] = React.useState(targetValue);

  const handleDecrease = () => {
    if (type === "price") {
      console.log(`Step is ${customStep} targetValue is ${targetValue} ${Number(priceInternal) - customStep}`);
      const newPrice = (Number(priceInternal) - customStep);
      const salePrice = Number(newPrice) + (Number(newPrice) * 0.25);
      setPrice(salePrice)
      setFloorPrice(newPrice);
      setPriceInternal(newPrice);
    } else {
      console.log(`Step is ${customStep} targetValue is ${targetValue} ${Number(priceInternal) - customStep}`);
      const newSupply = (Number(priceInternal) - customStep);
      setTokenSupply(newSupply)
      setPriceInternal(newSupply);
    }
  }

  const handleIncrease = () => {
    if (type === "price") {
      console.log(`Step is ${customStep} targetValue is ${targetValue} ${Number(priceInternal) + customStep}`);
      const newPrice = (Number(priceInternal) + customStep);
      const salePrice = Number(newPrice) + (Number(newPrice) * 0.25);
      setPrice(salePrice)
      setFloorPrice(newPrice);
      setPriceInternal(newPrice);
    } else {
      console.log(`Step is ${customStep} targetValue is ${targetValue} ${Number(priceInternal) + customStep}`);
      const newSupply = (Number(priceInternal) + customStep);
      setTokenSupply(newSupply)
      setPriceInternal(newSupply);
    }
  }

  return (
    <ChakraNumberInput.Root ref={ref} variant="outline" {...rest}>
      {children}
      {!isMobile && (
        <ChakraNumberInput.Control h={"10px"}  mr={marginRight} mt={"5px"} >
          <ChakraNumberInput.IncrementTrigger onClick={handleIncrease}/>
          <ChakraNumberInput.DecrementTrigger onClick={handleDecrease}/>
        </ChakraNumberInput.Control>
      )}
    </ChakraNumberInput.Root>
  );
});

export const NumberInputField = ChakraNumberInput.Input;
export const NumberInputScrubber = ChakraNumberInput.Scrubber;
export const NumberInputLabel = ChakraNumberInput.Label;