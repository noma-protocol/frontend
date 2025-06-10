import React, { useState, useEffect } from "react";
import { Box, Text } from "@chakra-ui/react";
import { formatTime } from "../utils";
import { isMobile } from "react-device-detect";

function CountdownTimer({ startTsMs, intervalDays }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    // Validate inputs
    if (
      !startTsMs ||
      isNaN(Number(startTsMs)) ||
      intervalDays == null ||
      isNaN(Number(intervalDays))
    ) {
      setTimeLeft("Invalid input");
      return;
    }

    const start    = Number(startTsMs);
    const interval = Number(intervalDays);
    const target   = start + interval * 24 * 60 * 60 * 1000;

    console.log(`Countdown from: ${new Date(start).toLocaleString()}`);
    console.log(`Countdown target: ${new Date(target).toLocaleString()}`);
    console.log(`Countdown interval: ${interval} days`);

    // **Declare the timer reference here** so it's in scope inside `update()`
    let timer;

    function update() {
      try {
        const now  = Date.now();
        const diff = target - now;

        if (diff <= 0) {
          setTimeLeft("Expired");
          clearInterval(timer);
        } else {
          setTimeLeft(formatTime(diff));
        }
      } catch (error) {
        console.error("Error updating countdown:", error);
        setTimeLeft("Error");
        clearInterval(timer);
      }
    }

    update();                    // run immediately
    timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, [startTsMs, intervalDays]);

  return (
    <Box>
      <Text fontSize={isMobile ? "xs" : "md"} >
        {timeLeft}
      </Text>
    </Box>
  );
}

export default CountdownTimer;
