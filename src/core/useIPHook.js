import { useState, useEffect } from "react";
import axios from "axios";

const useIP = () => {
  const [isSpanishCountry, setIsSpanishCountry] = useState(false);

  const spanishSpeakingCountries = [
    "AR", // Argentina
    "BO", // Bolivia
    "CL", // Chile
    "CO", // Colombia
    "CR", // Costa Rica
    "CU", // Cuba
    "DO", // Dominican Republic
    "EC", // Ecuador
    "SV", // El Salvador
    "ES", // Spain
    "GQ", // Equatorial Guinea
    "GT", // Guatemala
    "HN", // Honduras
    "MX", // Mexico
    "NI", // Nicaragua
    "PA", // Panama
    "PY", // Paraguay
    "PE", // Peru
    "PR", // Puerto Rico
    "UY", // Uruguay
    "VE", // Venezuela
  ];

  useEffect(() => {
    const getIpInfo = async () => {
      try {
        const response = await axios.get(`https://ipinfo.io/json`, {
          headers: {
            Authorization: "Bearer 09cb7343bf10a2",
          },
        });
        const ipInfo = response.data;
        setIsSpanishCountry(spanishSpeakingCountries.includes(ipInfo.country));
      } catch (error) {
        console.error("Error fetching IP info:", error);
      }
    };

    getIpInfo();

    // Cleanup function
    return () => {
      // Any cleanup code if needed
    };
  }, []);

  return { isSpanishCountry };
};

export default useIP;
